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
import { CalibrationRecording, SimRoomClass } from "../types/simrooms"
import { ClassAnalysisResult, ViewSegment } from "../types/Analysis"
import { Recording } from "../types/recording"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ClassesAPI } from "../api/classesApi"
import { ClassSelectionDialog } from "../components/VoorwerpSelectionDialog"
import { CalibrationAPI } from "../api/calibrationsApi"

export default function EyeTracking() {
  const [classes, setClasses] = useState<SimRoomClass[]>([])
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [calibrationRecordings, setCalibrationRecordings] = useState<CalibrationRecording[]>([])
  const [selectedClasses, setSelectedClasses] = useState<number[]>([])
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(0);


  function formatSeconds(sec: number | null) {
    if (sec === null) return "--:--";
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
// Inside polling loop:
  useEffect(() => {
    const load = async () => {
      const rec = await RecordingsAPI.getLocal()
      setRecordings(rec)
      if (rec.length > 0) setSelectedRecording(rec[0].id)

      const classes = await ClassesAPI.getClasses()
      const calibrationRecordings = await CalibrationAPI.getCalibrationRecordings()
      setClasses(classes)
      setCalibrationRecordings(calibrationRecordings)
    }
    load()
  }, [])



  const toggleClass = (id: number) => {
    setSelectedClasses(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const runAnalysis = async () => {
    if (!selectedRecording || selectedClasses.length === 0) return;

    setLoading(true);
    setResult(null);

    try {
      // 1. Start analysis and get job_id
      const { job_id } = await AnalysisAPI.runAnalysis(
        selectedRecording,
        selectedClasses
      );

      // 2. Poll progress until finished
      let progress = 0;
      while (progress < 1) {
        await new Promise((res) => setTimeout(res, 1000)); // 1s delay
        const data = await AnalysisAPI.getProgress(job_id);
        progress = data.progress;
        setProgress(progress);
        setEta(data.eta_seconds);
      }

      // 3. Fetch final result
      const finalResult = await AnalysisAPI.getResult(job_id);
      setResult(finalResult);
    } finally {
      setLoading(false);
    }
  };

return (
  <div className="min-h-screen bg-[#F4F9FC] py-16 px-6">
    <div className="max-w-6xl mx-auto space-y-14">

      {/* HEADER */}
      <div>
        <h1 className="text-4xl font-bold text-[#4CA2D5] tracking-tight">
          Stap 2
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Kies de opname en de voorwerpen die u wilt analyseren.
        </p>
      </div>

      {/* SELECTION SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* RECORDING */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden h-full">
          <CardHeader className="bg-[#4CA2D5] text-white">
            <CardTitle >
              1. Selecteer opname
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 py-4">
            <Select
              value={selectedRecording ?? ""}
              onValueChange={(value: any) => setSelectedRecording(value)}
            >
              <SelectTrigger className="w-full rounded-lg">
                <SelectValue placeholder="Select recording" />
              </SelectTrigger>

              <SelectContent>
              {recordings
                .filter(
                  (rec) =>
                    !calibrationRecordings.some((cal) => cal.recording.id === rec.id)
                )
                .map((rec) => (
                  <SelectItem key={rec.id} value={rec.id}>
                    {rec.participant ?? rec.id} –{" "}
                    {rec.duration.split(".")[0].slice(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* CLASSES */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden h-full">
          <CardHeader className="bg-[#F4A261] text-white">
            <CardTitle>
              2. Selecteer voorwerpen
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 py-4">
            {/* SELECTED CLASSES PREVIEW */}
            {selectedClasses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedClasses.map((id) => {
                  const cls = classes.find(c => c.id === id)
                  if (!cls) return null

                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 bg-[#F4A261]/10 text-[#F4A261] px-3 py-1.5 rounded-full text-sm font-medium"
                    >
                      {cls.class_name}

                      <button
                        onClick={() => toggleClass(id)}
                        className="text-xs hover:text-red-500 transition"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <ClassSelectionDialog
              classes={classes}
              selectedClasses={selectedClasses}
              toggleClass={toggleClass}
            />

            <Button
              onClick={runAnalysis}
              className="w-full bg-[#4CA2D5] hover:bg-[#3B8CBF] text-white rounded-xl py-6 text-base"
              disabled={loading || selectedClasses.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Analyse wordt uitgevoerd... ({(progress*100).toFixed(0)}%, ETA {formatSeconds(eta)})
                </>
              ) : (
                "Start Analyse"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
      {loading && (
        <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
          <div
            className="bg-[#4CA2D5] h-3 rounded-full transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
      {/* RESULTS */}
      {result && (
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden h-full">
          <CardHeader className="bg-[#16B0A5] text-white">
            <CardTitle>
              Analyse Resultaten
            </CardTitle>
            <CardDescription>
              Overzicht van totale kijktijd en specifieke kijkmomenten per geselecteerd object.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {result.classes.map((cls: ClassAnalysisResult) => (
                <div
                  key={cls.class_id}
                  className="rounded-2xl border bg-[#FAFDFF] p-6 shadow-sm hover:shadow-md transition"
                >
                  <h3 className="font-semibold text-lg text-[#4CA2D5]">
                    {cls.class_name}
                  </h3>

                  <p className="mt-3 text-sm">
                    Totale kijktijd:
                    <span className="block text-xl font-bold mt-1">
                      {cls.total_view_time_seconds.toFixed(2)} s
                    </span>
                  </p>

                  <div className="mt-4 text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto pr-2">
                    {cls.view_segments.map((seg: ViewSegment, i: number) => {
                      const startSec = (seg.start_frame / result.fps).toFixed(2);
                      const endSec = (seg.end_frame / result.fps).toFixed(2);
                      return <div key={i}>Tijd {startSec}s → {endSec}s</div>;
                    })}
                  </div>
                </div>
              ))}
            </div>

          </CardContent>
        </Card>
      )}

    </div>
  </div>
)
}