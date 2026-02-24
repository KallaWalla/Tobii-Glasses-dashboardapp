import { useEffect, useRef, useState } from "react"
import { LabelingAPI } from "../api/labelingApi"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Timeline } from "../components/Timeline"
import ClassList from "../components/ClassList"
import AnnotationList from "../components/AnnotationList"



export default function Labeler() {
  const [image, setImage] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [annotations, setAnnotations] = useState<any[]>([])
  const [frameIdx, setFrameIdx] = useState(0)
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    try {
      setLoading(true)

      const cls = await LabelingAPI.getClasses()
      setClasses(cls)

      await refreshFrameData()
    } catch (err) {
      console.error("Failed to load labeling:", err)
    } finally {
      setLoading(false)
    }
  }

const refreshFrameData = async () => {
  try {
    const [img, tl, ann] = await Promise.all([
      LabelingAPI.getCurrentFrame(),
      LabelingAPI.getTimeline(),
      LabelingAPI.getAnnotations(),
    ])

    setImage(img)
    setTimeline(tl)
    setFrameIdx(tl.current_frame_idx)
    setAnnotations(ann)
  } catch (e) {
    console.error("Refresh failed", e)
  }
}

const handleSeek = async (newFrame: number) => {
  try {
    await LabelingAPI.getTimeline(newFrame) 
    await refreshFrameData()
  } catch (e) {
    console.error("Seek failed", e)
  }
}

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading labeling session…
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-muted/40 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* LEFT */}
          <div className="lg:col-span-9 space-y-4">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>Labeling Canvas</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="relative flex h-[420px] w-full items-center justify-center rounded-xl border bg-muted/20">
                    {image ? (
                      <img
                        src={image}
                        className="max-h-full max-w-full rounded-lg object-contain cursor-crosshair"
                        onClick={async (e) => {
                          if (!timeline?.selected_class_id) return

                          const img = e.currentTarget
                          const rect = img.getBoundingClientRect()

                          const scaleX = img.naturalWidth / rect.width
                          const scaleY = img.naturalHeight / rect.height

                          const x = Math.round((e.clientX - rect.left) * scaleX)
                          const y = Math.round((e.clientY - rect.top) * scaleY)

                        await LabelingAPI.postAnnotation(
                          [x, y],
                          timeline.selected_class_id, 
                          false
                        )

                        await refreshFrameData()
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Loading frame...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            {/* Timeline */}
            <Timeline
              frameIdx={frameIdx}
              setFrameIdx={setFrameIdx}
              timeline={timeline}
              onSeek={handleSeek}
            />            


            {/* Annotations */}
              <AnnotationList
                annotations={annotations}
                onSeekFrame={handleSeek} 
                onAnnotationsUpdate={refreshFrameData} 
              />

          </div>

          {/* RIGHT */}
          <div className="lg:col-span-3 space-y-4">
            <ClassList
              classes={classes}
              timeline={timeline}
              setTimeline={setTimeline}
              onClassChange={refreshFrameData}
            />
          </div>
        </div>
      </div>
    </div>
  )
}