import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { RecordingsAPI } from "../api/recordingsApi"
import { Loader2, ArrowLeft } from "lucide-react"
import { Recording } from "../types/recording"
import { Button } from "../components/ui/button"

export default function RecordingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recording, setRecording] = useState<Recording | null>(null)
  const [loading, setLoading] = useState(true)
  const [videoLoading, setVideoLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const loadRecording = async () => {
      try {
        const data = await RecordingsAPI.getLocalById(id)
        setRecording(data)
      } catch (err) {
        console.error("Kon video niet ophalen", err)
      } finally {
        setLoading(false)
      }
    }

    loadRecording()
  }, [id])

  if (loading) {
    return <div className="p-8">Opname aan het laden...</div>
  }

  if (!recording) {
    return <div className="p-8 text-red-500">Opname niet gevonden</div>
  }

  return (
    <div className="p-8 space-y-6">
      {/* BACK BUTTON */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 mb-4"
      >
        <ArrowLeft size={16} />
        Terug
      </Button>

      <div>
        <h1 className="text-3xl font-bold">{recording.participant}</h1>
        <p className="text-gray-600">
          {new Date(recording.created).toLocaleString("nl-BE")}
        </p>
        <p className="text-gray-600">
          Duur: {recording.duration.split(".")[0].slice(2)}
        </p>
      </div>

      <div className="relative rounded-2xl overflow-hidden shadow-xl bg-black">
        {/* Loader overlay */}
        {videoLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="flex flex-col items-center gap-2 text-white">
              <Loader2 className="animate-spin h-8 w-8" />
              <span>Video laden...</span>
            </div>
          </div>
        )}

        <video
          controls
          className="w-full"
          src={RecordingsAPI.getLocalVideoUrl(id!)}
          onLoadedData={() => setVideoLoading(false)}
        />
      </div>
    </div>
  )
}