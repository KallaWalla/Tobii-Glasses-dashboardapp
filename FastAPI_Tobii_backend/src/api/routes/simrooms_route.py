from fastapi import APIRouter, Depends, HTTPException, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from src.api.db import get_db
from src.api.repositories import simrooms_repo
from src.api.services import recordings_service
from src.api.exceptions import NotFoundError

router = APIRouter(prefix="/simrooms")


@router.get("/")
async def get_simrooms(simroom_id: int | None = None, db: Session = Depends(get_db)):
    """
    Return all simrooms and optionally a selected simroom with its calibration recordings
    """
    recordings = recordings_service.get_all(db)
    simrooms = simrooms_repo.get_all_simrooms(db)

    response = {
        "recordings": [r.model_dump() for r in recordings],
        "simrooms": [s.model_dump() for s in simrooms],
    }

    if simroom_id:
        try:
            simroom = simrooms_repo.get_simroom(db, simroom_id)
        except NotFoundError:
            raise HTTPException(status_code=404, detail="Sim Room not found")
        # sort calibration recordings
        simroom.calibration_recordings.sort(key=lambda cr: cr.recording.created)
        response["selected_simroom"] = simroom.model_dump()

    return JSONResponse(content=response)


@router.post("/add")
async def add_simroom(name: str = Form(...), db: Session = Depends(get_db)):
    simroom = simrooms_repo.create_simroom(db, name=name)
    return JSONResponse(content=simroom.model_dump())


@router.delete("/{simroom_id}")
async def delete_simroom(simroom_id: int, db: Session = Depends(get_db)):
    if not simrooms_repo.exists(db, simroom_id):
        raise HTTPException(status_code=404, detail="Sim Room not found")
    simrooms_repo.delete_simroom(db, simroom_id)
    return JSONResponse(content={"message": "Sim Room deleted"})


@router.get("/{simroom_id}/classes")
async def get_simroom_classes(simroom_id: int, db: Session = Depends(get_db)):
    try:
        simroom = simrooms_repo.get_simroom(db, simroom_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Sim Room not found")
    classes = [cls.model_dump() for cls in simroom.classes]
    return JSONResponse(content={"simroom_id": simroom_id, "classes": classes})


@router.post("/{simroom_id}/classes/add")
async def add_simroom_class(
    simroom_id: int, class_name: str = Form(...), db: Session = Depends(get_db)
):
    simrooms_repo.create_simroom_class(db, simroom_id=simroom_id, class_name=class_name)
    # return updated class list
    simroom = simrooms_repo.get_simroom(db, simroom_id)
    classes = [cls.model_dump() for cls in simroom.classes]
    return JSONResponse(content={"simroom_id": simroom_id, "classes": classes})


@router.delete("/{simroom_id}/classes/{class_id}")
async def delete_simroom_class(simroom_id: int, class_id: int, db: Session = Depends(get_db)):
    simrooms_repo.delete_simroom_class(db, class_id)
    simroom = simrooms_repo.get_simroom(db, simroom_id)
    classes = [cls.model_dump() for cls in simroom.classes]
    return JSONResponse(content={"simroom_id": simroom_id, "classes": classes})


@router.post("/{simroom_id}/calibration_recordings")
async def add_calibration_recording(
    simroom_id: int, recording_id: str = Form(...), db: Session = Depends(get_db)
):
    simrooms_repo.add_calibration_recording(db, simroom_id=simroom_id, recording_id=recording_id)
    simroom = simrooms_repo.get_simroom(db, simroom_id)
    cal_records = [cr.model_dump() for cr in simroom.calibration_recordings]
    return JSONResponse(content={"simroom_id": simroom_id, "calibration_recordings": cal_records})


@router.delete("/{simroom_id}/calibration_recordings/{calibration_id}")
async def delete_calibration_recording(simroom_id: int, calibration_id: int, db: Session = Depends(get_db)):
    simrooms_repo.delete_calibration_recording(db, calibration_id)
    simroom = simrooms_repo.get_simroom(db, simroom_id)
    cal_records = [cr.model_dump() for cr in simroom.calibration_recordings]
    return JSONResponse(content={"simroom_id": simroom_id, "calibration_recordings": cal_records})