from dataclasses import dataclass
from typing import Annotated, cast

from fastapi import APIRouter, Depends, Form, HTTPException, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.api.db import get_db
from src.api.exceptions import (
    LabelingServiceNotAvailableError,
    NoClassSelectedError,
    TrackingJobAlreadyRunningError,
)
from src.api.models import App
from src.api.repositories import annotations_repo
from src.api.services import annotations_service, simrooms_service
from src.api.services.labeling_service import Labeler
from ..utils import image_utils
import base64

router = APIRouter(prefix="/labeling")


def require_labeler(request) -> Labeler:
    app = cast(App, request.app)
    if app.labeler is None:
        raise LabelingServiceNotAvailableError()
    return app.labeler


@router.post("/")
async def start_labeling(calibration_id: int, db: Session = Depends(get_db)):
    cal_rec = simrooms_service.get_calibration_recording(db=db, calibration_id=calibration_id)
    labeler = Labeler(cal_rec=cal_rec)
    # store labeler in app state
    return JSONResponse(content={"message": "Labeling started"})


@router.get("/point_labels")
async def get_point_labels(db: Session = Depends(get_db), labeler: Labeler = Depends(require_labeler)):
    point_labels = annotations_service.get_point_labels(
        db=db, calibration_id=labeler.calibration_id, frame_idx=labeler.current_frame_idx
    )
    return JSONResponse(content=[pl.model_dump() for pl in point_labels])


@router.get("/current_frame")
async def get_current_frame(db: Session = Depends(get_db), labeler: Labeler = Depends(require_labeler)):
    frame = labeler.get_current_frame_overlay(db=db)
    png_bytes = image_utils.encode_to_png_bytes(frame)
    # Return base64 for React-friendly usage
    b64_frame = base64.b64encode(png_bytes).decode("utf-8")
    return JSONResponse(content={"image": f"data:image/png;base64,{b64_frame}"})


@router.get("/timeline")
async def get_timeline(
    db: Session = Depends(get_db),
    labeler: Labeler = Depends(require_labeler),
    frame_idx: int | None = None
):
    frame_idx = labeler.current_frame_idx if frame_idx is None else frame_idx
    selected_class_id = labeler.selected_class_id

    timeline = {
        "current_frame_idx": frame_idx,
        "frame_count": labeler.frame_count,
        "selected_class_id": selected_class_id,
        "tracks": [],
        "selected_class_color": None,
        "tracking_progress": None,
        "is_tracking": False
    }

    if labeler.has_selected_class:
        simroom_class = simrooms_service.get_simroom_class(db=db, class_id=selected_class_id)
        timeline["tracks"] = annotations_repo.get_tracks(labeler.current_class_results_path)
        timeline["selected_class_color"] = simroom_class.color

    if labeler.is_tracking_current_class and labeler.tracking_progress is not None:
        timeline["tracking_progress"] = labeler.tracking_progress
        timeline["is_tracking"] = True

    labeler.seek(frame_idx)
    return JSONResponse(content=timeline)


@router.get("/classes")
async def get_classes(db: Session = Depends(get_db), labeler: Labeler = Depends(require_labeler)):
    classes = simrooms_service.get_simroom_classes(db=db, simroom_id=labeler.simroom_id)
    labeler.set_selected_class_id(db, classes[0].id if classes else None)
    return JSONResponse(content=[cls.model_dump() for cls in classes])


@router.get("/annotations")
async def get_annotations(db: Session = Depends(get_db), labeler: Labeler = Depends(require_labeler)):
    annotations = annotations_service.get_annotations_by_class_id(
        db=db, calibration_id=labeler.calibration_id, class_id=labeler.selected_class_id
    )
    return JSONResponse(content=[ann.model_dump() for ann in annotations])


@dataclass
class AnnotationPostBody:
    point: tuple[int, int]
    label: int
    delete_point: bool = False


@router.post("/annotations")
async def post_annotation(
    body: AnnotationPostBody, db: Session = Depends(get_db), labeler: Labeler = Depends(require_labeler)
):
    if not labeler.has_selected_class:
        raise NoClassSelectedError()
    annotations_service.post_annotation_point(
        db=db,
        frame=labeler.current_frame,
        image_predictor=labeler.image_predictor,
        calibration_id=labeler.calibration_id,
        frame_idx=labeler.current_frame_idx,
        class_id=labeler.selected_class_id,
        new_point=body.point,
        new_label=body.label,
        delete_point=body.delete_point,
    )
    # Return current frame as base64
    frame = labeler.get_current_frame_overlay(db=db)
    b64_frame = base64.b64encode(image_utils.encode_to_png_bytes(frame)).decode("utf-8")
    return JSONResponse(content={"image": f"data:image/png;base64,{b64_frame}"})


@router.delete("/annotations/{annotation_id}")
async def delete_annotation(annotation_id: int, db: Session = Depends(get_db), labeler: Labeler = Depends(require_labeler)):
    annotations_repo.delete_annotation(db, annotation_id)
    annotations = annotations_service.get_annotations_by_class_id(
        db=db, calibration_id=labeler.calibration_id, class_id=labeler.selected_class_id
    )
    return JSONResponse(content=[ann.model_dump() for ann in annotations])


@router.post("/tracking")
async def start_tracking(db: Session = Depends(get_db), labeler: Labeler = Depends(require_labeler)):
    if labeler.is_tracking:
        raise TrackingJobAlreadyRunningError()
    if not labeler.has_selected_class:
        raise NoClassSelectedError()
    annotations = annotations_service.get_annotations_by_class_id(
        db=db, calibration_id=labeler.calibration_id, class_id=labeler.selected_class_id
    )
    labeler.start_tracking(annotations)
    return await get_timeline(db=db, labeler=labeler)


@router.post("/settings")
async def update_settings(show_inactive_classes: Annotated[bool, Form()], labeler: Labeler = Depends(require_labeler)):
    labeler.set_show_inactive_classes(show_inactive_classes)
    return JSONResponse(content={"show_inactive_classes": show_inactive_classes})


@router.get("/settings")
async def get_settings(labeler: Labeler = Depends(require_labeler)):
    return JSONResponse(content={"show_inactive_classes": labeler.show_inactive_classes})