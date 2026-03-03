import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { LabelingAPI } from "@/api/LabelingAPI"
import { PropsClassList } from "../types/classList"
import { Button } from "./ui/button"
import { SimRoomClass } from "../types/simrooms"
import { Trash2, Plus } from "lucide-react"
import { Input } from "./ui/input"
import { ClassesAPI } from "../api/classesApi"

const ClassItem = memo(function ClassItem({
  cls,
  isActive,
  onSelect,
  onDelete,
}: {
  cls: SimRoomClass
  isActive: boolean
  onSelect: (id: number) => void
  onDelete: (cls: SimRoomClass) => void
}) {
  return (
    <div
      onClick={() => onSelect(cls.id)}
      className={`
        flex items-center justify-between rounded-xl border px-4 py-3 
        cursor-pointer transition hover:brightness-90
        ${isActive ? "border-2 border-primary" : "border-slate-200"}
      `}
      style={{
        backgroundColor: cls.color || "#fff",
        color: "#fff",
      }}
    >
      <span className="flex-1 truncate">{cls.class_name}</span>

      <Button
        size="icon"
        variant="destructive"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(cls)
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
})

export default function ClassList({
  classes,
  timeline,
  setTimeline,
  onClassChange,
}: PropsClassList) {
  const [newClassName, setNewClassName] = useState("")
  const [localClasses, setLocalClasses] = useState(classes)
  const [search, setSearch] = useState("")
  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalClasses(classes)
  }, [classes])

  const filteredClasses = useMemo(() => {
    return localClasses.filter((cls) =>
      cls.class_name.toLowerCase().includes(search.toLowerCase())
    )
  }, [localClasses, search])

  const rowVirtualizer = useVirtualizer({
    count: filteredClasses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  })

  const handleSelectClass = useCallback(
    async (classId: number) => {
      try {
        await LabelingAPI.selectClass(classId)
        const updatedTimeline = await LabelingAPI.getTimeline()
        setTimeline(updatedTimeline)
        await onClassChange()
      } catch (err) {
        console.error("Failed to select class:", err)
      }
    },
    [setTimeline, onClassChange]
  )

  const handleAddClass = useCallback(async () => {
    if (!newClassName.trim()) return

    try {
      await ClassesAPI.addClass(newClassName.trim())
      setNewClassName("")

      const updatedClasses = await LabelingAPI.getClasses()
      setLocalClasses(updatedClasses)
      await onClassChange()
    } catch (err) {
      console.error("Failed to add class:", err)
    }
  }, [newClassName, onClassChange])

  const handleDeleteClass = useCallback(
    async (cls: SimRoomClass) => {
      if (!confirm("Ben je zeker? Alle annotaties worden verwijderd.")) return

      try {
        await ClassesAPI.deleteClass(cls.id)
        const updatedClasses = await LabelingAPI.getClasses()
        setLocalClasses(updatedClasses)
        await onClassChange()
      } catch (err) {
        console.error("Failed to delete class:", err)
      }
    },
    [onClassChange]
  )

  return (
    <Card className="shadow-xl border-0 rounded-2xl overflow-hidden xl:col-span-4">
      <CardHeader className="bg-[#4CA2D5] text-white">
        <CardTitle>Simulatie Voorwerpen</CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* ADD + SEARCH */}
        <div className="flex gap-2">
          <Input
            placeholder="Naam nieuw voorwerp"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddClass()}
          />
          <Button size="icon" onClick={handleAddClass}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Input
          placeholder="Zoek voorwerp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* VIRTUALIZED LIST */}
        <div
          ref={parentRef}
          className="h-[400px] overflow-auto"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const cls = filteredClasses[virtualRow.index]
              const isActive = timeline?.selected_class_id === cls.id

              return (
                <div
                  key={cls.id}
                  style={{

                    top: 0,
                    left: 0,
                    width: "100%",
                  }}
                >
                  <ClassItem
                    cls={cls}
                    isActive={isActive}
                    onSelect={handleSelectClass}
                    onDelete={handleDeleteClass}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}