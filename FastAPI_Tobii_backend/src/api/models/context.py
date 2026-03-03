from typing import Any

from fastapi import Request
from pydantic import BaseModel, ConfigDict, Field

from src.api.models.pydantic import (
    AnnotationDTO,
    RecordingDTO,
    SimRoomClassDTO,
    CalibrationRecordingDTO,
)
from src.config import Template


class BaseContext(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    request: Request = Field(..., exclude=True)

    def model_dump(self, **kwargs) -> dict[str, Any]:  # type: ignore[no-untyped-def]
        base = super().model_dump(**kwargs)
        base["request"] = self.request
        return base


# ============================================================
# Glasses
# ============================================================

class GlassesConnectionContext(BaseContext):
    glasses_connected: bool
    battery_level: float


# ============================================================
# Recordings
# ============================================================

class RecordingsContext(BaseContext):
    recordings: list[RecordingDTO] = Field(default_factory=list)
    glasses_connected: bool = False
    failed_connection: bool = False
    content: str = Template.RECORDINGS


# ============================================================
# Calibration Recordings (vervangt SimRooms)
# ============================================================

class CalibrationRecordingsContext(BaseContext):
    recordings: list[RecordingDTO] = Field(default_factory=list)
    calibration_recordings: list[CalibrationRecordingDTO] = Field(default_factory=list)
    selected_calibration: CalibrationRecordingDTO | None = None
    content: str = Template.SIMROOMS  # hergebruik template indien gewenst


# ============================================================
# Classes
# ============================================================

class ClassListContext(BaseContext):
    calibration_id: int
    classes: list[SimRoomClassDTO]


# ============================================================
# Labeling
# ============================================================

class LabelingContext(BaseContext):
    calibration_id: int
    recording_id: str
    show_inactive_classes: bool
    content: str = Template.LABELER


class LabelingAnnotationsContext(BaseContext):
    annotations: list[AnnotationDTO]


class LabelingTimelineContext(BaseContext):
    frame_count: int
    current_frame_idx: int
    selected_class_id: int
    selected_class_color: str = "#000000"
    tracks: list[tuple[int, int]] = Field(default_factory=list)
    tracking_progress: float = 0.0
    is_tracking: bool = False
    update_canvas: bool = False


class LabelingClassesContext(BaseContext):
    selected_class_id: int
    calibration_id: int
    classes: list[SimRoomClassDTO]


class LabelingSettingsContext(BaseContext):
    show_inactive_classes: bool