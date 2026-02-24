import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LabelingAPI } from "@/api/LabelingAPI"
import { FrameState } from "../types/labeling"



export function Timeline({ frameIdx, setFrameIdx,timeline, onSeek }: FrameState) {
  const [loadingTrack, setLoadingTrack] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)





  useEffect(() => {
    if (!timeline?.is_tracking) return

    const interval = setInterval(() => {
      onSeek(frameIdx)
    }, 1000)

    return () => clearInterval(interval)
  }, [timeline?.is_tracking, frameIdx])

  // 🎬 Seek frame
  const handleSeek = async (newFrame: number) => {
    setFrameIdx(newFrame)
    await onSeek(newFrame)
  }

  // 🖱 Click on timeline bar
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newFrame = Math.floor(percent * timeline.frame_count)

    handleSeek(newFrame)
  }

  const handleStartTracking = async () => {
    try {
      setLoadingTrack(true)
      await LabelingAPI.startTracking()
      await onSeek(frameIdx) // refresh parent data
    } catch (err: any) {
      alert(err.response?.data || "Tracking error")
    } finally {
      setLoadingTrack(false)
    }
  }

  if (!timeline) {
    return <Card><CardContent>Loading timeline...</CardContent></Card>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Track Button */}
        <Button
          onClick={handleStartTracking}
          disabled={loadingTrack || timeline.is_tracking}
        >
            Start Tracking
            </Button>

        {/* Timeline Bar */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="relative w-full h-8 bg-muted rounded cursor-pointer overflow-hidden"
        >

          {/* Tracking Progress */}
          {timeline.is_tracking && (
            <div
              className="absolute h-full bg-blue-500"
              style={{
                width: `${(timeline.tracking_progress || 0) * 100}%`
              }}
            />
          )}

          {/* Track Segments */}
          {timeline.tracks?.map((track: [number, number], i: number) => (
            <div
              key={i}
              className="absolute h-full opacity-70"
              style={{
                left: `${(track[0] / timeline.frame_count) * 100}%`,
                width: `${((track[1] - track[0]) / timeline.frame_count) * 100}%`,
                backgroundColor: timeline.selected_class_color
              }}
            />
          ))}

          {/* Current Position Marker */}
          <div
            className="absolute top-0 w-1 h-full bg-white border border-black"
            style={{
              left: `${(timeline.current_frame_idx / timeline.frame_count) * 100}%`,
              transform: "translateX(-50%)"
            }}
          />
        </div>

        {/* Frame Info */}
        <div className="text-sm text-muted-foreground">
          Frame {timeline.current_frame_idx} / {timeline.frame_count - 1}
        </div>

      </CardContent>
    </Card>
  )
}