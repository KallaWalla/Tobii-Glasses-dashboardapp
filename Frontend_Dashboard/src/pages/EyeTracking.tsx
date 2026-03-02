import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"

import { AnalysisAPI, AnalysisResponse } from "@/api/analysisApi"
import { RecordingsAPI } from "@/api/recordingsApi"
import { SimroomsAPI } from "@/api/simroomsApi"
import { SimRoomClass } from "../types/simrooms"
import { ClassAnalysisResult, ViewSegment } from "../types/Analysis"
import { Recording } from "../types/recording"
import { cn } from "../lib/utils"

export default function EyeTracking() {
  const [classes, setClasses] = useState<SimRoomClass[]>([])
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [selectedClasses, setSelectedClasses] = useState<number[]>([])
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [simrooms, setSimrooms] = useState<any[]>([])
  const [selectedSimroom, setSelectedSimroom] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const rec = await RecordingsAPI.getLocal()
      setRecordings(rec)
      if (rec.length > 0) setSelectedRecording(rec[0].id)

      const rooms = await SimroomsAPI.getSimrooms()
      setSimrooms(rooms.simrooms)
    }
    load()
  }, [])

  const handleSimroomChange = async (simroomId: number) => {
    setSelectedSimroom(simroomId)
    setSelectedClasses([])
    const data = await SimroomsAPI.getSimroomClasses(simroomId)
    setClasses(data.classes)
  }

  const toggleClass = (id: number) => {
    setSelectedClasses(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const runAnalysis = async () => {
    if (!selectedRecording || selectedClasses.length === 0) return
    setLoading(true)
    setResult(null)
    try {
      const data = await AnalysisAPI.runAnalysis(selectedRecording, selectedClasses)
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#F4F9FC] p-10 space-y-12">
      <div>
        <h1 className="text-4xl font-bold text-[#4CA2D5] tracking-tight">
          Eye Tracking Analyse
        </h1>
        <p className="text-muted-foreground mt-2">
          Analyseer kijkgedrag van een deelnemer op geselecteerde objecten binnen een simulatiekamer.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* RECORDING */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden xl:col-span-4">
          <CardHeader className="bg-[#4CA2D5] text-white">
            <CardTitle>1. Selecteer opname</CardTitle>
            <CardDescription className="text-white/80">
              Kies de opname van de deelnemer die je wil analyseren.
              Dit is de sessie waarvan het kijkgedrag zal worden onderzocht.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <select
              className="w-full rounded-lg border p-3 bg-white"
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

        {/* SIMROOM */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden xl:col-span-4">
          <CardHeader className="bg-[#16B0A5] text-white">
            <CardTitle>2. Selecteer simulatiekamer</CardTitle>
            <CardDescription className="text-white/80">
              Kies de simulatiekamer waarin de objecten zijn gedefinieerd.
              Enkel objecten uit deze kamer kunnen geanalyseerd worden.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <select
              className="w-full rounded-lg border p-3 bg-white"
              value={selectedSimroom ?? ""}
              onChange={(e) => handleSimroomChange(Number(e.target.value))}
            >
              <option value="">Kies een simulatiekamer</option>
              {simrooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* CLASSES */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden xl:col-span-4">
          <CardHeader className="bg-[#F4A261] text-white">
            <CardTitle>3. Selecteer objecten</CardTitle>
            <CardDescription className="text-white/80">
              Vink de objecten aan waarvoor je wil weten hoe lang en wanneer
              de deelnemer ernaar heeft gekeken.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {!selectedSimroom && (
              <p className="text-sm text-[#F4A261]/80 text-center">
                Kies eerst een simulatiekamer
              </p>
            )}

            {selectedSimroom && (
              <ScrollArea className="max-h-[250px] pr-4">
                <div className="space-y-3">
                  {classes.map(cls => (
                    <div key={cls.id} className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedClasses.includes(cls.id)}
                        onCheckedChange={() => toggleClass(cls.id)}
                      />
                      <span className="text-sm">{cls.class_name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <Button
              onClick={runAnalysis}
              className="w-full mt-4 bg-[#4CA2D5] hover:bg-[#3B8CBF] text-white rounded-xl"
              disabled={loading || !selectedSimroom || selectedClasses.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Analyse wordt uitgevoerd...
                </>
              ) : (
                "Start Analyse"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* RESULTS */}
      {result && (
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle>Analyse Resultaten</CardTitle>
            <CardDescription>
              Overzicht van totale kijktijd en specifieke kijkmomenten per geselecteerd object.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {result.classes.map((cls: ClassAnalysisResult) => (
              <div
                key={cls.class_id}
                className="rounded-2xl border bg-white p-6 shadow-sm"
              >
                <h3 className="font-semibold text-lg text-[#4CA2D5]">
                  {cls.class_name}
                </h3>

                <p className="mt-2 text-sm">
                  Totale kijktijd:{" "}
                  <span className="font-bold text-base">
                    {cls.total_view_time_seconds.toFixed(2)} seconden
                  </span>
                </p>

                <div className="mt-4 text-sm text-muted-foreground space-y-1">
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