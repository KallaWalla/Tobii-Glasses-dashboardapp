import shutil

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from src.api.models.pydantic import SAMAnnotationDTO
from sqlalchemy.orm import Session
from pathlib import Path
import numpy as np
import torch
import tempfile
import uuid
from typing import Dict

from src.api.db import get_db
from src.api.repositories import classes_repo
from src.api.services import recordings_service
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
from src.api.services.embeddings_service import get_embeddings,dinov2_model
from PIL import Image
import torch.nn.functional as F
from sklearn.cluster import KMeans
torch.set_float32_matmul_precision("high")
torch.set_autocast_enabled(False)

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


    all_annotations: list[SAMAnnotationDTO] = []
    class_map = {}


    # ---------------------------------
    # Generate frame embeddings
    # ---------------------------------
    samples: list[np.ndarray] = [
        np.array(Image.open(frame_path).convert("RGB"))
        for frame_path in frame_files
    ]

    frame_embeddings = [None] * len(samples)

    for embeddings, start, end in get_embeddings(dinov2_model, samples):
        for i, emb in enumerate(embeddings):
            frame_embeddings[start + i] = emb.cpu()

    embedding_tensor = torch.stack(frame_embeddings).float()
    embedding_tensor = F.normalize(embedding_tensor, dim=1)

    # ---------------------------------
    # Select frames where gaze exists
    # ---------------------------------
    gaze_frames = sorted(gaze_positions.keys())

    if len(gaze_frames) == 0:
        gaze_frames = list(range(0, frame_count, 30))  # fallback every 30 frames

    gaze_embeddings = embedding_tensor[gaze_frames]

    # ---------------------------------
    # Cluster gaze embeddings
    # ---------------------------------
    num_clusters = min(5, len(gaze_frames))

    kmeans = KMeans(n_clusters=num_clusters, random_state=0)
    cluster_ids = kmeans.fit_predict(gaze_embeddings.numpy())

    # ---------------------------------
    # Pick representative frame per cluster
    # ---------------------------------
    selected_frames = []

    for cluster_id in range(num_clusters):

        indices = [i for i, cid in enumerate(cluster_ids) if cid == cluster_id]

        cluster_frames = [gaze_frames[i] for i in indices]

        cluster_embeddings = gaze_embeddings[indices]

        center = torch.tensor(
            kmeans.cluster_centers_[cluster_id]
        ).unsqueeze(0)

        sims = torch.mm(cluster_embeddings, center.T).squeeze()

        best_idx = torch.argmax(sims).item()

        selected_frames.append(cluster_frames[best_idx])

    # ---------------------------------
    # Create annotations
    # ---------------------------------
    all_annotations: list[SAMAnnotationDTO] = []
    class_map = {}

    for class_id in body.class_ids:

        sim_class = classes_repo.get_class(db, class_id)
        if not sim_class:
            continue

        class_map[class_id] = sim_class

        for frame_idx in selected_frames:

            if frame_idx not in gaze_positions:
                continue

            gaze_x, gaze_y = gaze_positions[frame_idx]

            annotation = SAMAnnotationDTO(
                id=str(uuid.uuid4()),
                simroom_class_id=class_id,
                frame_idx=frame_idx,
                point_labels=[
                    {
                        "x": int(gaze_x),
                        "y": int(gaze_y),
                        "label": 1,
                    }
                ],
            )

            all_annotations.append(annotation)

    if not all_annotations:
        return {"job_id": job_id}
    



    sam2_frames_dir = Path(tempfile.mkdtemp())
    for f in frames_dir.iterdir():
        if f.is_file() and f.suffix.lower() == ".jpg":
            shutil.copy(f, sam2_frames_dir / f.name)

    # Maak result dir
    temp_results_dir = Path(tempfile.mkdtemp()) / "multi_tracking"
    temp_results_dir.mkdir(exist_ok=True)

    # TrackingJob aanmaken
    tracking_job = TrackingJob(
        annotations=all_annotations,
        frames_path=frames_dir,
        results_path=temp_results_dir,
        frame_count=frame_count,
        video_path=sam2_frames_dir,
    )

    ACTIVE_JOBS[job_id] = tracking_job

    # -----------------------------
    # Background runner
    # -----------------------------
    def job_runner():
        tracking_job.run()

        
        device = "cuda" if torch.cuda.is_available() else "cpu"

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
                box = data["box"]

                x1, y1, x2, y2 = box

                gaze_x, gaze_y = gaze_position

                # check if gaze inside bounding box
                if not (x1 <= gaze_x < x2 and y1 <= gaze_y < y2):
                    continue

                # convert to ROI coordinates
                roi_x = int(gaze_x - x1)
                roi_y = int(gaze_y - y1)

                # check mask bounds
                h, w = mask.shape[-2], mask.shape[-1]

                if 0 <= roi_x < w and 0 <= roi_y < h:
                    if mask_was_viewed(mask, (roi_x, roi_y)):
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