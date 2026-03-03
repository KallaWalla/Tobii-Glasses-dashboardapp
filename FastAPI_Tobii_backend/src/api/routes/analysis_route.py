from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pathlib import Path
import numpy as np
import torch
import tempfile
import uuid
from typing import Dict

from src.api.db import get_db
from src.api.repositories import classes_repo
from src.api.services import recordings_service, annotations_service
from src.api.services.gaze_service import (
    get_gaze_position_per_frame,
    mask_was_viewed,
)
from src.api.services.labeling_service import TrackingJob
from src.config import TOBII_GLASSES_FPS
from src.api.models.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    ClassAnalysisResult,
    ViewSegment,
)
from src.utils import extract_frames_to_dir


router = APIRouter(prefix="/analyse")

# Store active jobs in memory
ACTIVE_JOBS: Dict[str, TrackingJob] = {}

# Store finished results
FINISHED_RESULTS: Dict[str, AnalysisResponse] = {}


# -----------------------------------------
# START ANALYSIS (NON BLOCKING)
# -----------------------------------------
@router.post("/")
async def run_analysis(
    body: AnalysisRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    job_id = str(uuid.uuid4())

    recording = recordings_service.get(
        db=db,
        recording_id=body.recording_id,
    )

    if recording is None:
        raise HTTPException(status_code=404, detail="Recording not found")

    video_path = recording.video_path
    recording_id = recording.id

    frames_dir = Path(tempfile.mkdtemp())
    extract_frames_to_dir(video_path, frames_dir)

    frame_files = sorted(frames_dir.glob("*.jpg"))
    frame_count = len(frame_files)
    fps = TOBII_GLASSES_FPS

    gaze_positions = get_gaze_position_per_frame(
        recording_id=recording_id,
        frame_count=frame_count,
    )

    all_annotations = []
    class_map = {}

    for class_id in body.class_ids:
        sim_class = classes_repo.get_class(db, class_id)
        if sim_class is None:
            continue

        annotations = annotations_service.get_all_annotations_by_class_id(
            db=db,
            class_id=class_id,
        )

        if not annotations:
            continue

        all_annotations.extend(annotations)
        class_map[class_id] = sim_class

    if not all_annotations:
        return {"job_id": job_id}

    temp_results_dir = frames_dir / "multi_tracking"
    temp_results_dir.mkdir(exist_ok=True)

    tracking_job = TrackingJob(
        annotations=all_annotations,
        frames_path=frames_dir,
        results_path=temp_results_dir,
        frame_count=frame_count,
        class_id=-1,
    )

    ACTIVE_JOBS[job_id] = tracking_job

    # -----------------------------
    # Background runner
    # -----------------------------
    def job_runner():
        tracking_job.run()

        results = []

        # Evaluate gaze per class
        for class_id, sim_class in class_map.items():

            class_dir = temp_results_dir / str(class_id)
            if not class_dir.exists():
                continue

            viewed_frames = []

            for npz_file in class_dir.glob("*.npz"):
                data = np.load(str(npz_file))
                frame_idx = int(data["frame_idx"])

                if frame_idx not in gaze_positions:
                    continue

                gaze_position = gaze_positions[frame_idx]
                mask = torch.tensor(data["mask"])

                frame_height, frame_width = 1080, 1920
                mask_height, mask_width = mask.shape[-2], mask.shape[-1]

                gaze_x_scaled = gaze_position[0] * mask_width / frame_width
                gaze_y_scaled = gaze_position[1] * mask_height / frame_height

                if mask_was_viewed(mask, (gaze_x_scaled, gaze_y_scaled)):
                    viewed_frames.append(frame_idx)

            viewed_frames = sorted(viewed_frames)

            segments = []
            start = None
            prev = None

            for f in viewed_frames:
                if start is None:
                    start = f
                elif prev is not None and f != prev + 1:
                    segments.append((start, prev))
                    start = f
                prev = f

            if start is not None:
                segments.append((start, prev))

            total_frames = sum(end - start + 1 for start, end in segments)
            total_seconds = total_frames / fps

            results.append(
                ClassAnalysisResult(
                    class_id=class_id,
                    class_name=sim_class.class_name,
                    total_view_time_seconds=total_seconds,
                    view_segments=[
                        ViewSegment(start_frame=s, end_frame=e)
                        for s, e in segments
                    ],
                )
            )

        FINISHED_RESULTS[job_id] = AnalysisResponse(
            recording_id=recording_id,
            fps=fps,
            classes=results,
        )

        ACTIVE_JOBS.pop(job_id, None)

    background_tasks.add_task(job_runner)

    return {"job_id": job_id}


# -----------------------------------------
# PROGRESS ENDPOINT
# -----------------------------------------
@router.get("/progress/{job_id}")
async def get_progress(job_id: str):
    job = ACTIVE_JOBS.get(job_id)

    if not job:
        return {"progress": 1.0, "eta_seconds": 0}

    return {
        "progress": job.progress,
        "eta_seconds": job.eta_seconds,
    }


# -----------------------------------------
# GET RESULT
# -----------------------------------------
@router.get("/result/{job_id}", response_model=AnalysisResponse)
async def get_result(job_id: str):
    result = FINISHED_RESULTS.get(job_id)

    if not result:
        raise HTTPException(status_code=404, detail="Result not ready")

    return result