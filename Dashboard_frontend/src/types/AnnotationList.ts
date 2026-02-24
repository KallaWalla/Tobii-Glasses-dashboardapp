
export type Annotation = {
  id: number
  frame_idx: number
  frame_crop_base64: string
}

export type PropsAnnotationList = {
  annotations: Annotation[]
  onSeekFrame: (frameIndex: number) => void
  onAnnotationsUpdate: (updated: Annotation[]) => void
}