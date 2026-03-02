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
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react"
import { cn } from "../lib/utils"
import { SimRoomsPageProps } from "../types/simrooms"
import { SimroomsAPI } from "../api/simroomsApi"
import AnnotationViewer from "./AnnotationViewer"


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
  const [searchClassName, setSearchClassName] = useState("") // 🔹 voor zoeken
  const [newClassName, setNewClassName] = useState("")
  const [newSimRoomName, setNewSimRoomName] = useState("")
  const [selectedRecordingId, setSelectedRecordingId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loadingLabeling, setLoadingLabeling] = useState<string | null>(null)
  const [viewingClass, setViewingClass] = useState<{
  classId: number;
  className: string;
} | null>(null)
  
  const selectedSimRoom = simrooms?.find(
    (s) => s.id === selectedSimRoomId
  );



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
  if (viewingClass && selectedSimRoom) {
    const simClass = selectedSimRoom.classes.find(c => c.id === viewingClass.classId);
    if (!simClass) return null;

    return (
      <AnnotationViewer
        simRoom={selectedSimRoom}
        simClass={simClass}
        onBack={() => setViewingClass(null)}
      />
    );
  }

  return (
    <div className="bg-[#F4F9FC] p-10 space-y-12">
      <div>
        <h1 className="text-4xl font-bold text-[#4CA2D5] tracking-tight">
          Simulatiekamers Dashboard
        </h1>
      </div>
        {/* Instructions */}
      <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle>Hoe ga je te werk</CardTitle>
          <CardDescription>
            Op deze pagina kan je een calibratie opname maken met specifieke voorwerpen door onderstaande stappen de volgen.
            Een calibratie opname word gemaakt om voorwerpen tijdens de analyse te kunnen herkennen. Door references te maken van het voorwerp. hoe diverser het aantal references naar het voorwerp hoe beter de analyse zal werken. 
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal pl-5 space-y-2">
            <li>Maak een <strong>Simulatie kamer</strong> aan of kies een bestaande</li>
            <li>Voeg <strong>voorwerpen</strong> toe die moeten worden herkend</li>
            <li>kies een opname om de voorwerpen te <strong>Calibreren</strong></li>
          </ol>
          <p className="italic">
            Opmerking 1: voorwerpen kunnen toegevoegd worden tijdens het calibreren.
          </p>
          <p className="italic">
            hint: kies voor een opname waar het voorwerp in voorkomt.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* SIM ROOMS */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden xl:col-span-4">
          <CardHeader className="bg-[#4CA2D5] text-white">
            <CardTitle>Simulatie kamers</CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
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

            <ScrollArea className="max-h-[350px] overflow-auto">
                {simrooms?.length === 0 && (
                  <p className="text-center text-sm text-[#4CA2D5]/80">
                    Nog geen Simulatie kamers gemaakt
                  </p>
                )}
              <div className="space-y-2">

                {simrooms?.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => onSelectSimRoom(room.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:bg-[#F4F9FC] transition",
                      selectedSimRoomId === room.id &&
                        "bg-[#D9EFFF] border-[#4CA2D5]"
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
                            "Ben je zeker dat je de simulatie kamer wilt verwijderen en alle voorwerpen en calibartie opnames?"
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

        {/* CLASSES / SIMULATIE VOORWERPEN */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden xl:col-span-4">
          <CardHeader className="bg-[#16B0A5] text-white">
            <CardTitle>Simulatie voorwerpen</CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {!selectedSimRoom && (
              <p className="text-center text-sm text-[#16B0A5]/80">
                Kies eerst een simulatiekamer
              </p>
            )}

            {selectedSimRoom && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Beheer de voorwerpen voor{" "}
                  <span className="font-medium text-foreground">
                    {selectedSimRoom.name}
                  </span>.
                </p>
                <Input
                  placeholder="Zoek voorwerp..."
                  value={searchClassName}
                  onChange={(e) => setSearchClassName(e.target.value)}
                  className="mb-2"
                />

                {/* LIST OF CLASSES / VOORWERPEN */}
                <ScrollArea className="max-h-[300px] overflow-auto">
                  <div className="space-y-2">
                    {selectedSimRoom.classes
                      ?.filter((cls) =>
                        cls.class_name.toLowerCase().includes(searchClassName.toLowerCase()) // 🔹 filter op searchClassName
                      )
                      .map((cls) => {
                        const annotationCount =
                          selectedSimRoom.calibration_recordings?.reduce((total, cal) => {
                            const countForThisCal =
                              cal.annotations?.filter(
                                (ann) => ann.simroom_class_id === cls.id
                              ).length ?? 0
                            return total + countForThisCal
                          }, 0) ?? 0

                        return (
                          <div
                            key={cls.id}
                            className={cn(
                              "flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:bg-[#F4F9FC] transition")}

                              onClick={() =>
                              setViewingClass({ classId: cls.id, className: cls.class_name })
                            }
                          >
                            <div>
                              <span className="font-medium">{cls.class_name}</span>
                              <p className="text-xs text-gray-500">References: {annotationCount}</p>
                            </div>

                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (
                                  confirm(
                                    `Ben je zeker dat je "${cls.class_name}" wilt verwijderen? Alle annotaties van dit voorwerp worden ook verwijderd.`
                                  )
                                ) {
                                  await SimroomsAPI.deleteSimroomClass(
                                    selectedSimRoom.id,
                                    cls.id
                                  )
                                  await onSelectSimRoom(selectedSimRoom.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                  </div>
                </ScrollArea>

                {/* ADD NEW CLASS / VOORWERP */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Typ de naam van een nieuw voorwerp en druk op <strong>Enter</strong> om toe te voegen.
                  </p>
                    <Input
                      placeholder="Naam nieuw voorwerp"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && selectedSimRoom && newClassName.trim()) {
                          await SimroomsAPI.addSimroomClass(
                            selectedSimRoom.id,
                            newClassName.trim()
                          )

                          await onSelectSimRoom(selectedSimRoom.id)

                          setNewClassName("") // ✅ dit leegt het veld correct
                        }
                      }}
                    />
                </div>
              </>
            )}
          </CardContent>
        </Card>


        {/* CALIBRATION RECORDINGS */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden xl:col-span-4">
          <CardHeader className="bg-[#F4A261] text-white">
            <CardTitle>Calibratie opnames</CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {!selectedSimRoom && (
              <p className="text-center text-sm text-[#F4A261]/80">
                Kies eerst een simulatiekamer
              </p>
            )}
            {selectedSimRoom && (
              <div className="flex gap-2 mb-2">
                <Select
                  value={selectedRecordingId}
                  onValueChange={setSelectedRecordingId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="kies een opname" />
                  </SelectTrigger>
                  <SelectContent>
                    {recordings.map((rec) => (
                      <SelectItem
                        key={rec.id}
                        value={rec.id.toString()}
                      >
                        {rec.participant} - {new Date(rec.created).toLocaleString("nl-BE", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button size="icon" onClick={handleAddCalibration}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            <ScrollArea className="max-h-[350px] overflow-auto">
              {selectedSimRoom &&
                selectedSimRoom.calibration_recordings.length === 0 && (
                    <p className="text-center text-sm text-[#F4A261]/80">
                    Nog geen calibartie opnames toegevoegd
                  </p>
                )}

              <div className="space-y-2">
                {selectedSimRoom?.calibration_recordings.map(
                  (cal) => (
                    <div
                      key={cal.id}
                            className={cn(
                              "flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-[#F4F9FC] transition")}
                    >
                      <div>
                        <p className="font-medium">
                          {cal.recording.participant}
                        </p>
                          <p className="text-xs text-gray-500">
                            {new Date(cal.recording.created).toLocaleString("nl-BE", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          className="cursor-pointer"
                          disabled={loadingLabeling !== null} // disable alle knoppen tijdens loader
                          onClick={async () => {
                            try {
                              setLoadingLabeling(cal.id)
                              await onStartLabeling(cal.id, selectedSimRoom.id)
                            } finally {
                              setLoadingLabeling(null)
                            }
                          }}
                        >
                          {loadingLabeling === cal.id ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                          ) : (
                            <Pencil className="h-4 w-4 cursor-pointer" />
                          )}
                        </Button>

                        <Button
                          size="icon"
                          className="cursor-pointer"
                          variant="destructive"
                          onClick={() => {
                            if (
                              confirm(
                                "Deze calibratie opname"
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
