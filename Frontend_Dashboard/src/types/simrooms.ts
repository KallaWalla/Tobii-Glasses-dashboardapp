import { Recording } from "./recording"

export interface CalibrationRecording {
  id: string
  recording: Recording
  annotations: Annotation[]
}

export interface SimRoomClass {
  id: number
  simroom_id: string
  class_name: string
  color: string
  annotations: Annotation[]
}
export interface Annotation {
  id: number
  calibration_id: number
  simroom_class_id: number
  frame_idx: number
  mask_base64?: string
  frame_crop_base64?: string
  box_json?: string
  point_labels: PointLabel[]
}
export interface PointLabel {
  id: number
  annotation_id: number
  x: number
  y: number
  label: number
}



export interface SimRoom {
  id: string
  name: string
  calibration_recordings: CalibrationRecording[]
  classes: SimRoomClass[]
}


export interface SimRoomsPageProps {
  calibrationRec: CalibrationRecording[]
  classes: SimRoomClass[]
  recordings: Recording[]
  onAddClass: (
    newClassName: string
  ) => Promise<void>
  onDeleteClass: (
    classId: number
  ) => Promise<void>
  onAddCalibrationRecording: (
    recordingId: string
  ) => Promise<void>
  onDeleteCalibrationRecording: (
    calibrationId: string
  ) => Promise<void>
  onStartLabeling: (calibrationId: string) => void
  handleAnnotationsChanged: () => void
}
