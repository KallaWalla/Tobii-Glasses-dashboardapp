import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

import { AnalysisAPI, AnalysisResponse } from "@/api/analysisApi"
import { LabelingAPI } from "@/api/labelingApi"
import { RecordingsAPI } from "@/api/recordingsApi"
import { ClassAnalysisResult, ViewSegment } from "../types/Analysis"
import { Recording } from "../types/recording"
import { SimRoomClass } from "../types/simrooms"
import { SimroomsAPI } from "../api/simroomsApi"



export default function EyeTracking() {
  const [classes, setClasses] = useState<SimRoomClass[]>([])
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [selectedClasses, setSelectedClasses] = useState<number[]>([])
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [simrooms, setSimrooms] = useState<any[]>([])
  const [selectedSimroom, setSelectedSimroom] = useState<number | null>(null)
  // Load classes
  useEffect(() => {

    const loadRecordings = async () => {
      const data = await RecordingsAPI.getLocal()
      setRecordings(data)
      if (data.length > 0) {
        setSelectedRecording(data[0].id)
      }
    }

    const loadSimrooms = async () => {
      const data = await SimroomsAPI.getSimrooms()
      setSimrooms(data.simrooms)
  }

    loadSimrooms()
    loadRecordings()
  }, [])

  const handleSimroomChange = async (simroomId: number) => {
    setSelectedSimroom(simroomId)
    setSelectedClasses([])

    const data = await SimroomsAPI.getSimroomClasses(simroomId)
    setClasses(data.classes)
  }

  const toggleClass = (id: number) => {
    setSelectedClasses(prev =>
      prev.includes(id)
        ? prev.filter(c => c !== id)
        : [...prev, id]
    )
  }

  const runAnalysis = async () => {
    if (!selectedRecording || selectedClasses.length === 0) return

    setLoading(true)
    setResult(null)

    try {
      const data = await AnalysisAPI.runAnalysis(
        selectedRecording,
        selectedClasses
      )
      setResult(data)
    } catch (err) {
      console.error("Analysis failed:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">

      {/* Recording Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Recording</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            className="border rounded p-2 w-full"
            value={selectedRecording ?? ""}
            onChange={(e) => setSelectedRecording(e.target.value)}
          >
            {recordings.map(rec => (
              <option key={rec.id} value={rec.id}>
                {rec.participant ?? rec.id}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Simroom Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Simroom</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            className="border rounded p-2 w-full"
            value={selectedSimroom ?? ""}
            onChange={(e) => handleSimroomChange(Number(e.target.value))}
          >
            <option value="">Choose a simroom</option>
            {simrooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Class Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Classes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">

          {!selectedSimroom && (
            <p className="text-sm text-muted-foreground">
              Select a simroom first
            </p>
          )}

          {selectedSimroom &&
            classes.map((cls) => (
              <div key={cls.id} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedClasses.includes(cls.id)}
                  onCheckedChange={() => toggleClass(cls.id)}
                />
                <span>{cls.class_name}</span>
              </div>
            ))}

          <Button
            onClick={runAnalysis}
            className="mt-4"
            disabled={loading || !selectedSimroom || selectedClasses.length === 0}
          >
            {loading ? "Running Analysis..." : "Run Analysis"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.classes.map((cls : ClassAnalysisResult) => (
              <div key={cls.class_id} className="border p-4 rounded-lg">
                <h3 className="font-semibold">
                  {cls.class_name}
                </h3>

                <p>
                  Total View Time:{" "}
                  <span className="font-bold">
                    {cls.total_view_time_seconds.toFixed(2)}s
                  </span>
                </p>

                <div className="mt-2 text-sm text-muted-foreground">
                  {cls.view_segments.map((seg: ViewSegment, i: number) => (
                      <div key={i}>
                      Frames {seg.start_frame} → {seg.end_frame}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  )
}