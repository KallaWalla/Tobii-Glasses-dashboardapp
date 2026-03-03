import tempfile
from pathlib import Path

from sqlalchemy.orm import Session

from src.api.models.pydantic import CalibrationRecordingDTO, SimRoomClassDTO
from src.api.repositories import classes_repo
from src.config import RECORDINGS_PATH
from src.utils import extract_frames_to_dir

def get_class(db: Session, simroom_id: int) -> dict[int, str]:
    """
    Get a mapping of class IDs to class names.
    """
    classes = classes_repo.get_all_classes(db)
    return {simroom_class.id: simroom_class.class_name for simroom_class in classes}

def get_class_id_to_name_map(db: Session, simroom_id: int) -> dict[int, str]:
    """
    Get a mapping of class IDs to class names.
    """
    classes = classes_repo.get_all_classes(db)
    return {simroom_class.id: simroom_class.class_name for simroom_class in classes}


def get_tracked_classes(db: Session, calibration_id: int) -> list[SimRoomClassDTO]:
    """
    Get all classes that have annotations for a given calibration recording.
    """
    classes = classes_repo.get_tracked_classes(db, calibration_id)
    return [SimRoomClassDTO.from_orm(simroom_class) for simroom_class in classes]



def get_calibration_recording(
    db: Session, calibration_id: int
) -> CalibrationRecordingDTO:
    """
    Get a calibration recording by its ID.
    """
    calibration_recording = classes_repo.get_calibration_recording(db, calibration_id)
    return CalibrationRecordingDTO.from_orm(calibration_recording)


def extract_tmp_frames(
    recording_id: str,
    recordings_path: Path = RECORDINGS_PATH,
):
    recording_path = recordings_path / f"{recording_id}.mp4"
    tmp_frames_dir = tempfile.TemporaryDirectory()
    tmp_frames_path = Path(tmp_frames_dir.name)
    extract_frames_to_dir(
        video_path=recording_path,
        frames_path=tmp_frames_path,
        print_output=False,
    )
    frames = sorted(tmp_frames_path.glob("*.jpg"), key=lambda x: int(x.stem))

    return frames, tmp_frames_dir
