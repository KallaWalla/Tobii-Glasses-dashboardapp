export interface ViewSegment {
  start_frame: number
  end_frame: number
}

export interface ClassAnalysisResult {
  class_id: number
  class_name: string
  total_view_time_seconds: number
  view_segments: ViewSegment[]
}

export interface AnalysisResponse {
  recording_id: string
  fps: number
  classes: ClassAnalysisResult[]
}