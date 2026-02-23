import React, { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Alert, AlertDescription } from "./ui/alert"
import { ScrollArea } from "./ui/scroll-area"
import { Plus, Trash2, Pencil } from "lucide-react"
import { cn } from "../lib/utils"
import { SimRoomsPageProps } from "../types/simrooms"
import { SimroomsAPI } from "../api/simroomsApi"


export default function SimRoomsComponent({
  simrooms,
  recordings,
  selectedSimRoomId,
  onAddSimRoom,
  onDeleteSimRoom,
  onSelectSimRoom,
  onAddCalibrationRecording,
  onDeleteCalibrationRecording,
  onStartLabeling,
}: SimRoomsPageProps) {
  const [newSimRoomName, setNewSimRoomName] = useState("")
  const [selectedRecordingId, setSelectedRecordingId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const selectedSimRoom = simrooms.find(
    (s) => s.id === selectedSimRoomId
  )

  const handleAddSimRoom = async () => {
    if (!newSimRoomName.trim()) return
    try {
      await onAddSimRoom(newSimRoomName.trim())
      setNewSimRoomName("")
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to create Sim Room")
    }
  }

  const handleAddCalibration = async () => {
    if (!selectedSimRoom || !selectedRecordingId) return
    try {
      await onAddCalibrationRecording(
        selectedSimRoom.id,
        String(selectedRecordingId)
      )
      setSelectedRecordingId("")
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to add calibration recording")
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How this page works</CardTitle>
          <CardDescription>
            Follow these steps to configure your simulation environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal pl-5 space-y-2">
            <li>Create a <strong>Sim Room</strong></li>
            <li>Add <strong>Classes</strong> for labeling</li>
            <li>Add and label <strong>Calibration Recordings</strong></li>
          </ol>
          <p className="italic">
            Note: Classes can also be added while labeling.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* SIM ROOMS */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Sim Rooms</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 flex-1 flex flex-col">
            <div className="flex gap-2">
              <Input
                placeholder="New sim room name"
                value={newSimRoomName}
                onChange={(e) => setNewSimRoomName(e.target.value)}
              />
              <Button size="icon" onClick={handleAddSimRoom}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-2">
                {simrooms.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    No sim rooms created
                  </p>
                )}

                {simrooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => onSelectSimRoom(room.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-3 cursor-pointer transition hover:bg-muted",
                      selectedSimRoomId === room.id &&
                        "bg-muted"
                    )}
                  >
                    <span className="font-medium text-sm">
                      {room.name}
                    </span>

                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (
                          confirm(
                            "Delete this Sim Room and all related data?"
                          )
                        ) {
                          onDeleteSimRoom(room.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* CLASSES */}
        <Card>
          <CardHeader>
            <CardTitle>Sim Room Classes</CardTitle>
          </CardHeader>

          <CardContent>
            {selectedSimRoom ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage classes for{" "}
                  <span className="font-medium text-foreground">
                    {selectedSimRoom.name}
                  </span>
                </p>

                {/* LIST OF CLASSES */}
                <div className="space-y-2 mb-4">
                  {selectedSimRoom.classes?.map((cls) => (
                    <div
                      key={cls.id}
                      className="flex justify-between items-center border p-2 rounded"
                    >
                      <span>{cls.class_name}</span>
                    </div>
                  ))}
                </div>

                {/* ADD NEW CLASS */}
                <Input
                  placeholder="New class name"
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && selectedSimRoom) {
                      await SimroomsAPI.addSimroomClass(
                        selectedSimRoom.id,
                        e.currentTarget.value
                      )
                      await onSelectSimRoom(selectedSimRoom.id)
                      e.currentTarget.value = ""
                    }
                  }}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a Sim Room to manage classes.
              </p>
            )}
          </CardContent>
        </Card>


        {/* CALIBRATION RECORDINGS */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Calibration Recordings</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 flex-1 flex flex-col">
            {selectedSimRoom && (
              <div className="flex gap-2">
                <Select
                  value={selectedRecordingId}
                  onValueChange={setSelectedRecordingId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recording" />
                  </SelectTrigger>
                  <SelectContent>
                    {recordings.map((rec) => (
                      <SelectItem
                        key={rec.id}
                        value={rec.id.toString()}
                      >
                        {rec.participant} — {rec.created}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button size="icon" onClick={handleAddCalibration}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            <ScrollArea className="flex-1 pr-2">
              {!selectedSimRoom && (
                <p className="text-sm text-muted-foreground">
                  Select a Sim Room first.
                </p>
              )}

              {selectedSimRoom &&
                selectedSimRoom.calibration_recordings.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No calibration recordings added.
                  </p>
                )}

              <div className="space-y-2">
                {selectedSimRoom?.calibration_recordings.map(
                  (cal) => (
                    <div
                      key={cal.id}
                      className="flex justify-between items-center border rounded-xl p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {cal.recording.participant}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cal.recording.created}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          onClick={() =>
                            onStartLabeling(cal.id)
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => {
                            if (
                              confirm(
                                "Delete this calibration recording?"
                              )
                            ) {
                              onDeleteCalibrationRecording(
                                selectedSimRoom.id,
                                cal.id
                              )
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
