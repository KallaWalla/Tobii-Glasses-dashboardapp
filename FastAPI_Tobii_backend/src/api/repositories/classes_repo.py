import shutil
from pathlib import Path
from sqlalchemy.orm import Session

from src.api.models.db import Annotation, CalibrationRecording, Recording, SimRoomClass
from src.api.exceptions import NotFoundError

def add_calibration_recording(db: Session, recording_id: str) -> CalibrationRecording:
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if recording is None:
        raise NotFoundError(f"Recording {recording_id} not found")

    calibration = CalibrationRecording(recording_id=recording_id)
    db.add(calibration)
    db.flush()
    db.refresh(calibration)

    calibration.tracking_results_path.mkdir(parents=True, exist_ok=True)
    return calibration


def delete_calibration_recording(db: Session, calibration_id: int) -> None:
    calibration = (
        db.query(CalibrationRecording)
        .filter(CalibrationRecording.id == calibration_id)
        .first()
    )

    if calibration is None:
        raise NotFoundError(f"Calibration {calibration_id} not found")

    if calibration.tracking_results_path.exists():
        shutil.rmtree(calibration.tracking_results_path)

    db.delete(calibration)


def get_calibration_recording(
    db: Session, calibration_id: int
) -> CalibrationRecording:
    calibration = (
        db.query(CalibrationRecording)
        .filter(CalibrationRecording.id == calibration_id)
        .first()
    )

    if calibration is None:
        raise NotFoundError(f"Calibration {calibration_id} not found")

    return calibration

def get_calibration_recordings(db: Session,):
    return db.query(CalibrationRecording).all()


def get_all_classes(db: Session):
    return db.query(SimRoomClass).all()

def get_class(
        db: Session, class_id: int
    ) -> SimRoomClass:
    sim_class = (
        db.query(SimRoomClass)
        .filter(SimRoomClass.id == class_id)
        .first()
    )

    if sim_class is None:
        raise NotFoundError(f"Calibration {class_id} not found")

    return sim_class

def create_class(db: Session, name: str) -> SimRoomClass:
    simroom_class = SimRoomClass(class_name=name)
    db.add(simroom_class)
    db.flush()
    db.refresh(simroom_class)
    return simroom_class


def delete_class(db: Session, class_id: int) -> None:
    simroom_class = (
        db.query(SimRoomClass)
        .filter(SimRoomClass.id == class_id)
        .first()
    )

    if simroom_class is None:
        raise NotFoundError(f"Class {class_id} not found")

    db.delete(simroom_class)

def get_tracked_classes(db: Session, calibration_id: int) -> list[SimRoomClass]:
    """
    Get all classes that have annotations for a given calibration recording.
    """
    cal_rec = get_calibration_recording(db, calibration_id=calibration_id)
    result_paths = cal_rec.tracking_result_paths
    result_paths = [path for path in result_paths if len(list(path.iterdir())) > 0]
    class_ids = [int(path.stem) for path in result_paths]
    return get_classes_by_ids(db, class_ids)

def get_classes_by_ids(db: Session, class_ids: list[int]) -> list[SimRoomClass]:
    """Get all classes for a sim room"""
    classes = db.query(SimRoomClass).filter(SimRoomClass.id.in_(class_ids)).all()
    return classes

def get_classes_by_calibration(db: Session, calibration_id: int) -> list[SimRoomClass]:
    """
    Get all classes that have annotations for a given calibration recording.
    """
    class_ids = (
        db.query(Annotation.simroom_class_id)
        .filter(Annotation.calibration_id == calibration_id)
        .distinct()
        .all()
    )
    # class_ids comes out as list of tuples [(1,), (2,), ...], so flatten it
    class_ids = [cid[0] for cid in class_ids]

    return get_classes_by_ids(db, class_ids)