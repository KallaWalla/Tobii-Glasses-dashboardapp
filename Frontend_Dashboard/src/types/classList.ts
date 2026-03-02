import { SimRoomClass } from "./simrooms"


export type Timeline = {
  current_frame_idx: number
  frame_count: number
  selected_class_id: number | null
  tracks: any[]
  selected_class_color: string | null
  tracking_progress: number | null
  is_tracking: boolean
}

export type PropsClassList = {
  classes: SimRoomClass[]
  timeline: Timeline | null
  setTimeline: React.Dispatch<React.SetStateAction<Timeline | null>>
  onClassChange: () => Promise<void> 
}