from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.responses import JSONResponse
from src.api.models.pydantic import CalibrationRecordingDTO
from sqlalchemy.orm import Session
from fastapi.encoders import jsonable_encoder

from src.api.db import get_db
from src.api.repositories import classes_repo
from src.api.exceptions import NotFoundError

router = APIRouter(prefix="/calibrations")


@router.post("/")
async def add_calibration_recording(
    recording_id: str = Form(...),
    db: Session = Depends(get_db),
):
    calibration = classes_repo.add_calibration_recording(
        db, recording_id=recording_id
    )
    db.commit()
    return JSONResponse(content={"calibration_id": calibration.id})


@router.delete("/{calibration_id}")
async def delete_calibration_recording(
    calibration_id: int,
    db: Session = Depends(get_db),
):
    try:
        classes_repo.delete_calibration_recording(db, calibration_id)
        db.commit()
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Calibration not found")

    return JSONResponse(content={"message": "Calibration deleted"})


@router.get("/{calibration_id}")
async def get_calibration_recording(
    calibration_id: int,
    db: Session = Depends(get_db),
):
    try:
        calibration = classes_repo.get_calibration_recording(
            db, calibration_id=calibration_id
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Calibration not found")

    return JSONResponse(content=jsonable_encoder(calibration))

@router.get("/")
async def get_calibration_recordings(db: Session = Depends(get_db)):
    try:
        calibrations = classes_repo.get_calibration_recordings(db)
        # Convert each calibration recording to DTO to include recording info
        calibration_data = [CalibrationRecordingDTO.from_orm(cal) for cal in calibrations]
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Calibrations not found")

    return JSONResponse(content=jsonable_encoder(calibration_data))