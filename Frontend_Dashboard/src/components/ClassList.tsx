import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { LabelingAPI } from "@/api/LabelingAPI"
import { PropsClassList } from "../types/classList"
import { Button } from "./ui/button"
import { SimRoomClass } from "../types/simrooms"
import { SimroomsAPI } from "../api/simroomsApi"
import { Trash2, Plus } from "lucide-react"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"
import { cn } from "../lib/utils"

export default function ClassList({
  classes,
  timeline,
  setTimeline,
  onClassChange,
}: PropsClassList) {
  const [newClassName, setNewClassName] = useState("")
  const [localClasses, setLocalClasses] = useState(classes)

  useEffect(() => {
    setLocalClasses(classes)
  }, [classes])

  async function handleSelectClass(classId: number) {
    try {
      await LabelingAPI.selectClass(classId)
      const updatedTimeline = await LabelingAPI.getTimeline()
      setTimeline(updatedTimeline)
      await onClassChange() 
    } catch (err) {
      console.error("Failed to select class:", err)
    }
  }

  async function handleAddClass() {
    if (!newClassName.trim()) return
    try {
      const simroomId = localClasses[0]?.simroom_id
      if (!simroomId) return

      await SimroomsAPI.addSimroomClass(simroomId, newClassName.trim())
      setNewClassName("")

      const updatedClasses = await LabelingAPI.getClasses()
      setLocalClasses(updatedClasses)
      await onClassChange()
    } catch (err) {
      console.error("Failed to add class:", err)
    }
  }

  async function handleDeleteClass(cls: SimRoomClass) {
    try {
      if (!confirm("Ben je zeker? Alle annotaties van deze class worden verwijderd.")) return
      await SimroomsAPI.deleteSimroomClass(cls.simroom_id, cls.id)
      const updatedClasses = await LabelingAPI.getClasses()
      setLocalClasses(updatedClasses)
      await onClassChange() 
    } catch (err) {
      console.error("Failed to delete class:", err)
    }
  }

  return (
    <Card className="shadow-xl border-0 rounded-2xl overflow-hidden xl:col-span-4">
      <CardHeader className="bg-[#4CA2D5] text-white">
        <CardTitle>Simulatie Voorwerpen</CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* ADD NEW CLASS */}
        <div className="flex gap-2 mb-2">
          <Input
            placeholder="Naam nieuw voorwerp"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                await handleAddClass()
              }
            }}
          />
          <Button size="icon" onClick={handleAddClass}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* CLASS LIST */}
        <ScrollArea className="max-h-[350px] overflow-auto">
          {localClasses.length === 0 && (
            <p className="text-center text-sm text-[#4CA2D5]/80">
              Nog geen voorwerpen toegevoegd
            </p>
          )}

          <div className="space-y-2">
            {localClasses.map((cls) => {
              const isActive = timeline?.selected_class_id === cls.id
              return (
                <div
                  key={cls.id}
                  onClick={() => handleSelectClass(cls.id)}
                  data-selected={timeline?.selected_class_id === cls.id ? "true" : "false"}
                  className="
                    relative
                    flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition 
                    transform hover:brightness-90
                    border-slate-200
                    data-[selected=true]:border-2
                    data-[selected=true]:border-primary
                  "
                  style={{
                    backgroundColor: cls.color || "#fff",
                    color: "#fff",
                  }}
                >
                  <span className="flex-1">{cls.class_name}</span>

                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={(e) => {
                      handleDeleteClass(cls)
                    }}
                    className="cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}