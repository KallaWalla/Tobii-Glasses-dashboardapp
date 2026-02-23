import { useEffect, useState } from "react"
import {
LabelingAPI
} from "../api/labelingApi"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "../components/ui/button"

export default function Labeler() {
  const [image, setImage] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [annotations, setAnnotations] = useState<any[]>([])
  const [frameIdx, setFrameIdx] = useState(0)

  // ✅ initial load
  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    const cls = await LabelingAPI.getClasses()
    setClasses(cls)

    const tl = await LabelingAPI.getTimeline()
    setTimeline(tl)

    const ann = await LabelingAPI.getAnnotations()
    setAnnotations(ann)

    const img = await LabelingAPI.getCurrentFrame()
    setImage(img)
  }


  // ✅ example frame polling (optional but powerful)
  useEffect(() => {
    const interval = setInterval(async () => {
      const img = await LabelingAPI.getCurrentFrame()
      setImage(img)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen w-full bg-muted/40 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* LEFT */}
          <div className="lg:col-span-9 space-y-4">
            {/* Canvas */}
            <Card>
              <CardHeader>
                <CardTitle>Labeling Canvas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-[420px] items-center justify-center rounded-xl border">
                  {image ? (
                    <img
                      src={image}
                      className="max-h-full rounded-lg"
                    />
                  ) : (
                    "Loading frame..."
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
              {timeline ? (
                <div className="space-y-4">
                  
                  {/* Frame Slider */}
                  <input
                    type="range"
                    min={0}
                    max={timeline.frame_count - 1}
                    value={timeline.current_frame_idx}
                    className="w-full"
                    onChange={async (e) => {
                      const newFrame = Number(e.target.value)

                      const tl = await LabelingAPI.getTimeline(newFrame)
                      setTimeline(tl)

                      const img = await LabelingAPI.getCurrentFrame()
                      setImage(img)
                    }}
                  />

                  {/* Frame Info */}
                  <div className="text-sm text-muted-foreground">
                    Frame {timeline.current_frame_idx} / {timeline.frame_count - 1}
                  </div>

                </div>
              ) : (
                "Loading timeline..."
              )}
            </CardContent>
            </Card>
            <Button
              onClick={async () => {
                const tl = await LabelingAPI.startTracking()
                setTimeline(tl)
              }}
            >
              Start Tracking
            </Button>
      
            {/* Annotations */}
            <Card>
              <CardHeader>
                <CardTitle>Annotations</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[260px]">
                  <pre className="text-xs">
                    {JSON.stringify(annotations, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs">
                  {JSON.stringify(classes, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}