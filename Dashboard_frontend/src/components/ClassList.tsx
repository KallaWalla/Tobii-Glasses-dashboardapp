import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { LabelingAPI } from "@/api/LabelingAPI"
import { PropsClassList } from "../types/classList"

export default function ClassList({
  classes,
  timeline,
  setTimeline,
  onClassChange,
}: PropsClassList) {
  const [newClassName, setNewClassName] = useState("")
  const [localClasses, setLocalClasses] = useState(classes)

  // Sync parent classes to local state
  useEffect(() => {
    setLocalClasses(classes)
  }, [classes])

  // Set active class styling
  useEffect(() => {
    const activeId = timeline?.selected_class_id
    window.dispatchEvent(
      new CustomEvent("classes-loaded", { detail: { selectedClassId: activeId } })
    )
  }, [timeline])

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

  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault()
    if (!newClassName.trim()) return

    try {
      await LabelingAPI.addClass(newClassName)
      const updatedClasses = await LabelingAPI.getClasses()
      setLocalClasses(updatedClasses)
      setNewClassName("")
      await onClassChange() 
    } catch (err) {
      console.error("Failed to add class:", err)
    }
  }

  async function handleDeleteClass(classId: number) {
    try {
      if (!confirm("Are you sure? This will delete all annotations linked to this class.")) return

      await LabelingAPI.deleteClass(classId)
      const updatedClasses = await LabelingAPI.getClasses()
      setLocalClasses(updatedClasses)
      await onClassChange() 
    } catch (err) {
      console.error("Failed to delete class:", err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classes</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add new class form */}
        <form className="mb-4 flex gap-2" onSubmit={handleAddClass}>
          <input
            type="text"
            placeholder="Enter class name"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            className="flex-1 border rounded px-2 py-1"
          />
          <button type="submit" className="btn btn-primary px-2 py-1">
            +
          </button>
        </form>

        {/* Class list */}
        {localClasses.length === 0 && (
          <div className="text-muted-foreground text-center py-2">
            No classes defined
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {localClasses.map((cls) => {
            const isActive = timeline?.selected_class_id === cls.id
            return (
              <li
                key={cls.id}
                className={`flex justify-between items-center p-2 rounded cursor-pointer transition
                  ${isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-black"}`}
                style={{ backgroundColor: cls.color }}
              >
                <span
                  className="flex-1"
                  onClick={() => handleSelectClass(cls.id)}
                >
                  {cls.class_name}
                </span>
                <button
                  onClick={() => handleDeleteClass(cls.id)}
                  className="btn btn-sm btn-danger ml-2"
                >
                  🗑
                </button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}