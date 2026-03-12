import random
import shutil

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from src.api.services import sam2_service
from src.api.models.pydantic import SAMAnnotationDTO, SAMPointDTO
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
from src.config import TOBII_GLASSES_FPS, Sam2Checkpoints
from src.api.models.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    ClassAnalysisResult,
    ViewSegment,
)
from src.utils import extract_frames_to_dir
# Replace the old broken import line:
from src.api.services.embeddings_service import get_crop_embedding, build_prototypes 
from PIL import Image
import torch.nn.functional as F
import cv2

router = APIRouter(prefix="/analyse")

# Store active jobs in memory
ACTIVE_JOBS: Dict[str, TrackingJob] = {}

# Store finished results
FINISHED_RESULTS: Dict[str, AnalysisResponse] = {}


MIN_ANNOTATIONS_PER_CLASS = 5
SIM_THRESHOLD = 0.6
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

    class_map = {}

    for class_id in body.class_ids:
        sim_class = classes_repo.get_class(db, class_id)
        class_map[class_id] = sim_class
    prototypes = build_prototypes(class_map)

    # ---------------------------------
    # Select frames where gaze exists
    # ---------------------------------

    gaze_frames = [
        frame_idx
        for frame_idx, (x, y) in gaze_positions.items()
        if x is not None and y is not None
    ]

    gaze_frames = sorted(gaze_frames)
    annotations = []

    if len(gaze_frames) == 0:
        gaze_frames = list(range(0, frame_count, 30))


    print("stap 1 alle data is opgehaald en geinistialiseerd", flush=True)

    sam2_model = sam2_service.load_generator(
                Sam2Checkpoints.SMALL
            )
    for frame_target in [2,3,4,5,6,7,8,9]:

        sampled_frames = sample_frames_evenly(gaze_frames, frame_target)

        print(f"running analysis with {frame_target} frames", flush=True)

        for frame_idx in sampled_frames:

            frame_path = frame_files[frame_idx]
            frame_img     = cv2.imread(str(frame_path))          # BGR uint8
            frame_img_rgb = cv2.cvtColor(frame_img, cv2.COLOR_BGR2RGB)  # RGB uint8
            
            mask_dicts = sam2_model.generate(frame_img_rgb)      # List[Dict]
            masks      = [m["segmentation"] for m in mask_dicts] # List[np.ndarray HW bool]


            # ---------------------------------
            # SAM2 segmentation
            # ---------------------------------


            print("stap 2.1 masks generated", flush=True)

            # ---------------------------------
            # Match masks to classes
            # ---------------------------------
            matches = match_masks_to_classes(masks, frame_img, prototypes)

            print("stap 2.2 masks matched", flush=True)

            # ---------------------------------
            # Create annotations
            # ---------------------------------

            for class_id, (x1, y1, x2, y2), score in matches:

                if score < SIM_THRESHOLD:
                    continue

                cx = int((x1 + x2) / 2)
                cy = int((y1 + y2) / 2)

                annotations.append(
                    SAMAnnotationDTO(
                        id=str(uuid.uuid4()),
                        simroom_class_id=class_id,
                        frame_idx=frame_idx,
                        point_labels=[SAMPointDTO(x=cx, y=cy, label=1)]  # ← proper object
                    )
                )

            print("stap 2.4 annotations done", flush=True)

        # ---------------------------------
        # Stop if enough annotations
        # ---------------------------------

        if enough_annotations(annotations, body.class_ids):
            print("genoeg annotaties gevonden", flush=True)
            break


    if not annotations:
        return {"job_id": job_id}
    

    print("stap 2 alle annotaties geinistialiseerd", flush=True)


    # Maak result dir
    temp_results_dir = Path(tempfile.mkdtemp()) / "multi_tracking"
    temp_results_dir.mkdir(exist_ok=True)

    # TrackingJob aanmaken
    tracking_job = TrackingJob(
        annotations=annotations,
        frames_path=frames_dir,
        results_path=temp_results_dir,
        frame_count=frame_count,
        video_path=video_path,
    )
    print("stap 3 Trackinjob geinistialiseerd", flush=True)

    ACTIVE_JOBS[job_id] = tracking_job
    # -----------------------------
    # Background runner
    # -----------------------------
    def job_runner():
        try:
            tracking_job.run()
            print("stap 4 Trackinjob run gedaan", flush=True)
            results = []
            # Evaluate gaze per class
            for class_id, sim_class in class_map.items():
                frame_owner = {}
                class_dir = temp_results_dir / str(class_id)
                if not class_dir.exists():
                    continue

                for npz_file in class_dir.glob("*.npz"):
                    data = np.load(str(npz_file))
                    frame_idx = int(data["frame_idx"])

                    if frame_idx not in gaze_positions:
                        continue
                    gaze_x, gaze_y = gaze_positions[frame_idx]

                    x1, y1, x2, y2 = data["box"]
                    if not (x1 <= gaze_x < x2 and y1 <= gaze_y < y2):
                        continue

                    mask = torch.tensor(data["mask"]).squeeze(0)
                    roi_x = int(gaze_x - x1)
                    roi_y = int(gaze_y - y1)
                    
                    if not (0 <= roi_x < mask.shape[1] and 0 <= roi_y < mask.shape[0]):
                        continue

                    if mask_was_viewed(mask, (roi_x, roi_y)):
                        frame_owner[frame_idx] = class_id

                viewed_frames = sorted(frame_owner.keys())

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
                total_frames=frame_count,
                classes=results,
            )
        except Exception as e:
            print(f"job_runner failed: {e}", flush=True)
            import traceback; traceback.print_exc()
            # Store an error marker so the client gets a real error
            FINISHED_RESULTS[job_id] = None  # or a dedicated error respons
        
        finally:
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




def sample_frames_evenly(frame_indices: list[int], n: int) -> list[int]:
    """Select n evenly spaced frames from a list."""
    if len(frame_indices) <= n:
        return frame_indices

    step = len(frame_indices) / n
    return [frame_indices[int(i * step)] for i in range(n)]


def annotations_per_class(annotations):
    counts = {}
    for ann in annotations:
        cid = ann.simroom_class_id
        counts[cid] = counts.get(cid, 0) + 1
    return counts


def enough_annotations(annotations, class_ids):
    counts = annotations_per_class(annotations)

    for cid in class_ids:
        if counts.get(cid, 0) < MIN_ANNOTATIONS_PER_CLASS:
            return False

    return True


def mask_to_bbox(mask):
    """Convert SAM mask to bounding box."""
    ys, xs = mask.nonzero()

    if len(xs) == 0 or len(ys) == 0:
        return None

    x1, x2 = xs.min(), xs.max()
    y1, y2 = ys.min(), ys.max()

    return (x1, y1, x2, y2)


def match_masks_to_classes(masks, frame_img, prototypes: dict[int, torch.Tensor]):
    matches = []

    for mask in masks:
        bbox = mask_to_bbox(mask)
        if bbox is None:
            continue

        x1, y1, x2, y2 = bbox
        crop = frame_img[y1:y2, x1:x2]

        if crop.size == 0:
            continue

        crop_emb = get_crop_embedding(crop)

        best_class = None
        best_score = 0.0

        for class_id, prototype in prototypes.items():
            score = F.cosine_similarity(
                crop_emb.unsqueeze(0),
                prototype.unsqueeze(0)
            ).item()

            if score > best_score:
                best_score = score
                best_class = class_id

        matches.append((best_class, bbox, best_score))

    return matches