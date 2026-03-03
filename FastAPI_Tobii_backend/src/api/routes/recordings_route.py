from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from src.api.db import get_db
from src.api.repositories import recordings_repo
from src.api.services import glasses_service, recordings_service

from datetime import datetime
from src.api.exceptions import NotFoundError
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[3] 
RECORDINGS_DIR = BASE_DIR / "data" / "recordings"


router = APIRouter(prefix="/recordings")


@router.get("/")
async def recordings():
    """
    Return a simple message or metadata about recordings endpoint.
    React can use /local or /glasses for actual data.
    """
    return JSONResponse({"message": "Use /local or /glasses to fetch recordings"})


@router.get("/local")
async def local_recordings(db: Session = Depends(get_db)):
    """
    Retrieve metadata for all recordings in the local directory
    """
    recordings = recordings_service.get_all(db)
    return [r for r in recordings]

@router.get("/local/{recording_id}")
async def get_local_recording(recording_id: str, db: Session = Depends(get_db)):
    """
    Retrieve metadata for a single local recording
    """
    try:
        recording = recordings_service.get(db, recording_id)
        return recording
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Recording not found")

@router.get("/local/{recording_id}/video")
async def stream_local_recording_video(recording_id: str, db: Session = Depends(get_db)):
    """
    Stream the mp4 file directly from data/recordings
    """
    recording = recordings_service.get(db, recording_id)
    video_file = RECORDINGS_DIR / f"{recording_id}.mp4"

    if not video_file.exists():
        raise HTTPException(status_code=404, detail="Video file not found")

    return FileResponse(
        path=video_file,
        media_type="video/mp4",
        filename=f"{recording.participant}.mp4",
    )

@router.delete("/local/{recording_id}")
async def delete_local_recording(recording_id: str, db: Session = Depends(get_db)):
    """
    Delete a recording from the local directory
    """
    recording = recordings_repo.get(db, recording_id)
    if recording is None:
        raise HTTPException(status_code=404, detail="Recording not found")

    recordings_repo.delete(db, recording_id)
    recordings = recordings_service.get_all(db)
    return [r for r in recordings]


@router.get("/glasses")
async def glasses_recordings():
    """
    Retrieve metadata for all recordings on the glasses
    """
    glasses_connected = await glasses_service.is_connected()
    if not glasses_connected:
        raise HTTPException(status_code=503, detail="Glasses not connected")

    recordings = await glasses_service.get_recordings()
    return [r for r in recordings]


@router.get("/glasses/{recording_id}/download")
async def download_recording(recording_id: str, db: Session = Depends(get_db)):
    """
    Download a recording from the glasses to local DB/storage
    """


    glasses_connected = await glasses_service.is_connected()
    if not glasses_connected:
        raise HTTPException(status_code=503, detail="Glasses not connected")

    await glasses_service.download_recording(db, recording_id)
    # Return updated local recordings
    recordings = recordings_service.get_all(db)
    return [r for r in recordings]
