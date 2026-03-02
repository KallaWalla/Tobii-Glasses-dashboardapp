import { useEffect, useState } from "react"
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
import { useLocation, useNavigate } from "react-router-dom"
import { SimroomsAPI } from "../api/simroomsApi"
import { SimRoom } from "../types/simrooms"
import { Button } from "../components/ui/button"



export default function Labeler() {
  const location = useLocation()
  const [image, setImage] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [annotations, setAnnotations] = useState<any[]>([])
  const [frameIdx, setFrameIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedSimRoom, setSelectedSimRoom] = useState<SimRoom | null>(null)
  const navigate = useNavigate()



  useEffect(() => {
    init()
    const fetchSimRoom = async () => {
      if (!location.state?.simRoomId) return

      try {
        const simroomsData = await SimroomsAPI.getSimrooms(location.state.simRoomId)
        // get the first (and only) sim room returned
        const sm = simroomsData.simrooms[0]
        setSelectedSimRoom(sm)
      } catch (err) {
        console.error("Failed to fetch sim room:", err)
      }
    }

    fetchSimRoom()
  }, [location.state])

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
      <div className="flex h-full w-full items-center justify-center p-6 text-sm text-muted-foreground">
        Loading labeling session…
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-muted/40">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT PANEL */}
          <div className="flex flex-col gap-6 lg:col-span-9">

            <Card className="shadow-xl border-0 rounded-t-2xl rounded-b-none overflow-hidden inline-block">
              {/* Header */}
              <CardHeader className="bg-[#16B0A5] text-white rounded-t-2xl">
                <CardTitle>Opname Canvas</CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                <div className="relative w-full border-0 border bg-background flex items-center justify-center">
                  {image ? (
                    <img
                      src={image}
                      className="w-full h-auto object-cover cursor-crosshair"
                      onClick={async (e) => {
                        if (!timeline?.selected_class_id) return
                        const img = e.currentTarget
                        const rect = img.getBoundingClientRect()

                        const scaleX = img.naturalWidth / rect.width
                        const scaleY = img.naturalHeight / rect.height

                        const x = Math.round((e.clientX - rect.left) * scaleX)
                        const y = Math.round((e.clientY - rect.top) * scaleY)

                        await LabelingAPI.postAnnotation([x, y], timeline.selected_class_id, false)
                        await refreshFrameData()
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#16B0A5] border-t-transparent" />
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
            <Card className="shadow-xl border-0 rounded-2xl overflow-hidden xl:col-span-4">
              <CardHeader className="bg-[#4CA2D5] text-white">
                <CardTitle>References</CardTitle>
              </CardHeader>
              <CardContent>
                <AnnotationList
                  annotations={annotations}
                  onSeekFrame={handleSeek}
                  onAnnotationsUpdate={refreshFrameData}
                />
              </CardContent>
            </Card>

          </div>

          {/* RIGHT SIDEBAR */}
          <div className="flex flex-col gap-6 lg:col-span-3">
              <ClassList
                classes={classes}
                timeline={timeline}
                setTimeline={setTimeline}
                onClassChange={refreshFrameData}
              />
              <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-400 text-white">
                  <CardTitle>
                    Hoe deze pagina werkt
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 text-sm text-gray-600">
                  <p>
                    Dit is de Calibratie pagina, hier kan je voorwerpen calibreren zodat ze herkenbaar worden voor de AI:  

                    <ol className="pt-2 list-decimal pl-5 space-y-2">
                      <li>Selecteer een <strong>voorwerp</strong>, als het een zwarte rand heeft is het geselecteerd</li>
                      <li>Op het canvas click je dan op het <strong>voorwerp</strong>, hierdoor zal er een gekleurde rand op het canvas komen <strong>Belangrijk: zorg dat alleen jouw voorwep in de gekleurde kader is</strong></li>
                      <li>Door op de <strong>tijdslijn</strong> te clicken verander je van Frame waar je dan opnieuw jouw voorwerp kan selecteren, dit blijf je herhalen tot je enkele references hebt </li>
                      <li>Als je op <strong>Start Tracking</strong> clickt zal de AI alle references zoeken in de opname van het geselecteerd voorwerp</li>
                    </ol>
                  </p>
                </CardContent>
              </Card>
              <div className="flex justify-start mb-4">
                <Button
                  size="lg"
                  className="bg-[#4CA2D5] hover:bg-[#3A91C1] text-white"
                  onClick={() => navigate("/simrooms")} 
                >
                  Terug
                </Button>
              </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}