from pydantic import BaseModel
from typing import List


class AnalysisRequest(BaseModel):
    recording_id: str
    class_ids: List[int]


class ViewSegment(BaseModel):
    start_frame: int
    end_frame: int


class ClassAnalysisResult(BaseModel):
    class_id: int
    class_name: str
    total_view_time_seconds: float
    view_segments: List[ViewSegment]


class AnalysisResponse(BaseModel):
    recording_id: str
    fps: float
    classes: List[ClassAnalysisResult]