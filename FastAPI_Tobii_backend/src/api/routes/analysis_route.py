from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
import numpy as np
import torch

from src.api.db import get_db
from src.api.services import recordings_service
from src.api.services import annotations_service
from src.api.services import simrooms_service
from src.api.services.labeling_service import get_class_tracking_results
from src.api.services.gaze_service import (
    get_gaze_position_per_frame,
    mask_was_viewed,
)
from src.config import TOBII_GLASSES_FPS
from src.api.models.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    ClassAnalysisResult,
    ViewSegment,
)
import tempfile
from src.utils import extract_frames_to_dir
from pathlib import Path
from src.api.services.labeling_service import TrackingJob

router = APIRouter(prefix="/analyse")

@router.post("/")
async def run_analysis(
    body: AnalysisRequest,
    db: Session = Depends(get_db),
):

    # 1️⃣ Load recording
    recording = recordings_service.get(
        db=db,
        recording_id=body.recording_id,
    )

    if recording is None:
        raise HTTPException(status_code=404, detail="Recording not found")

    video_path = recording.video_path
    recording_id = recording.id

    # 2️⃣ Extract frames temporarily

    frames_dir = Path(tempfile.mkdtemp())
    extract_frames_to_dir(video_path, frames_dir)

    frame_files = sorted(frames_dir.glob("*.jpg"))
    frame_count = len(frame_files)
    fps = TOBII_GLASSES_FPS

    # 3️⃣ Load gaze
    gaze_positions = get_gaze_position_per_frame(
        recording_id=recording_id,
        frame_count=frame_count,
    )

    results = []

    # 4️⃣ For each selected class
    for class_id in body.class_ids:

        sim_class = simrooms_service.get_simroom_class(db, class_id)

        # Get annotations for this class (global annotations)
        annotations = annotations_service.get_all_annotations_by_class_id(
            db=db,
            class_id=class_id,
        )

        if not annotations:
            continue

        # 5️⃣ Run tracking dynamically



        temp_results_dir = frames_dir / f"class_{class_id}"
        temp_results_dir.mkdir(exist_ok=True)
        
        # PosixPath or WindowsPath object

        tracking_job = TrackingJob(
            annotations=annotations,
            frames_path=frames_dir,
            results_path=temp_results_dir,
            frame_count=frame_count,
            class_id=class_id,
        )

        tracking_job.run()

        # 6️⃣ Evaluate gaze on generated masks
        viewed_frames = []

        for npz_file in temp_results_dir.glob("*.[nN][pP][zZ]"):
            data = np.load(str(npz_file))
            frame_idx = int(data["frame_idx"])

            if frame_idx not in gaze_positions:
                continue

            gaze_position = gaze_positions[frame_idx]
            mask = torch.tensor(data["mask"])



            frame_height, frame_width = 1080, 1920  # Replace with your actual frame size

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

    return AnalysisResponse(
        recording_id=recording_id,
        fps=fps,
        classes=results,
    )