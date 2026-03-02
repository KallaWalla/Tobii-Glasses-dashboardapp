import { LabelingAPI } from "../api/labelingApi"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import type { FrameState } from "./../types/labeling"
import { useRef, useState } from "react"

export function Timeline({ frameIdx, setFrameIdx, timeline, onSeek }: FrameState) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [isSeeking, setIsSeeking] = useState(false)

  const calculateFrameFromClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return 0

    const rect = timelineRef.current.getBoundingClientRect()
    const percent = Math.min(
      Math.max((e.clientX - rect.left) / rect.width, 0),
      1
    )

    return Math.floor(percent * (timeline.frame_count - 1))
  }

  const handleTimelineClick = async (e: React.MouseEvent) => {
    if (isSeeking) return

    const newFrame = calculateFrameFromClick(e)

    setIsSeeking(true)
    setFrameIdx(newFrame)

    await onSeek(newFrame)

    setIsSeeking(false)
  }

  if (!timeline) {
    return (
      <Card>
        <CardContent>Tijdslijn laden...</CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
      <CardHeader className="bg-[#F4A261] text-white">
        <CardTitle>Tijdslijn</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 p-6">

        {/* Tracking Button */}
        <Button
          onClick={() => LabelingAPI.startTracking()}
          disabled={timeline.is_tracking || isSeeking}
        >
          {timeline.is_tracking ? "Tracking…" : "Start Tracking"}
        </Button>

        {/* Timeline Bar */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className={`
            relative h-12 w-full cursor-pointer
            overflow-hidden rounded-xl border
            bg-muted transition
            ${isSeeking ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          {/* Track Segments */}
          {timeline.tracks?.map((track: [number, number], i: number) => (
            <div
              key={i}
              className="absolute h-full opacity-70 rounded-md"
              style={{
                left: `${(track[0] / timeline.frame_count) * 100}%`,
                width: `${((track[1] - track[0]) / timeline.frame_count) * 100}%`,
                backgroundColor: timeline.selected_class_color,
              }}
            />
          ))}

          {/* Current Frame Marker */}
          <div
            className="absolute top-0 h-full w-1.5 bg-foreground"
            style={{
              left: `${(frameIdx / timeline.frame_count) * 100}%`,
              transform: "translateX(-50%)",
            }}
          />

          {/* Loader Overlay */}
          {isSeeking && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#16B0A5] border-t-transparent" />
            </div>
          )}
        </div>

        {/* Frame Counter */}
        <div className="text-sm text-muted-foreground text-center">
          Frame <span className="font-medium">{frameIdx}</span> / {timeline.frame_count - 1}
        </div>

      </CardContent>
    </Card>
  )
}