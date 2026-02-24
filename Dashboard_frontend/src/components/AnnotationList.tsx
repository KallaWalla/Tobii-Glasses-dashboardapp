import { useEffect, useState } from "react"
import { LabelingAPI } from "@/api/LabelingAPI"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PropsAnnotationList } from "../types/AnnotationList"


export default function AnnotationList({
  annotations,
  onSeekFrame,
  onAnnotationsUpdate,
}: PropsAnnotationList) {
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null)

  // Sync with external seek events
  useEffect(() => {
    const handleSeek = (event: CustomEvent) => {
      setSelectedFrame(event.detail.frameIndex)
    }

    window.addEventListener(
      "labeling-seek-frame-index",
      handleSeek as EventListener
    )

    return () => {
      window.removeEventListener(
        "labeling-seek-frame-index",
        handleSeek as EventListener
      )
    }
  }, [])

  const scaleImage = (img: HTMLImageElement) => {
    const naturalWidth = img.naturalWidth
    const naturalHeight = img.naturalHeight
    const scale = 200 / Math.max(naturalWidth, naturalHeight)

    img.style.width = `${naturalWidth * scale}px`
    img.style.height = `${naturalHeight * scale}px`
    img.style.display = "block"
  }

  const handleClickThumbnail = (frameIndex: number) => {
    setSelectedFrame(frameIndex)
    onSeekFrame(frameIndex)
  }

  const handleDeleteAnnotation = async (id: number) => {
    if (!confirm("Are you sure? This will delete this annotation.")) return

    try {
      await LabelingAPI.deleteAnnotation(id)
      const newAnnotations = annotations.filter((ann) => ann.id !== id)
      onAnnotationsUpdate(newAnnotations)
    } catch (err) {
      console.error("Failed to delete annotation:", err)
    }
  }

  if (!annotations.length) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center">
        No annotations yet.
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3 mb-3">
      {annotations.map((ann) => (
        <Card
          key={ann.id}
          className={cn(
            "group relative overflow-hidden p-1 transition-all",
            "hover:shadow-md",
            selectedFrame === ann.frame_idx && "ring-2 ring-primary"
          )}
        >
          <img
            className="cursor-pointer rounded-md transition-opacity hover:opacity-90"
            src={`data:image/png;base64,${ann.frame_crop_base64}`}
            alt={`Annotation for frame ${ann.frame_idx}`}
            onClick={() => handleClickThumbnail(ann.frame_idx)}
              ref={(img) => {
                    if (img) scaleImage(img);
                    }}
          />

          <Button
            size="icon"
            variant="destructive"
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
            onClick={() => handleDeleteAnnotation(ann.id)}
          >
            🗑
          </Button>
        </Card>
      ))}
    </div>
  )
}
