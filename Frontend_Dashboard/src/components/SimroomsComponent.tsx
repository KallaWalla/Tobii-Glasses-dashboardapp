import React, { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import AnnotationViewer from "./AnnotationViewer"
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Separator } from "@/components/ui/separator"

export default function SimRoomsComponent({
  calibrationRec,
  classes,
  recordings,
  onAddClass,
  onDeleteClass,
  onAddCalibrationRecording,
  onDeleteCalibrationRecording,
  onStartLabeling,
  handleAnnotationsChanged,
}: SimRoomsPageProps) {
  const [searchClassName, setSearchClassName] = useState("") 
  const [newClassName, setNewClassName] = useState("")
  const [selectedRecordingId, setSelectedRecordingId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loadingLabeling, setLoadingLabeling] = useState<string | null>(null)
  const [viewingClass, setViewingClass] = useState<{
  classId: number;
  className: string;
} | null>(null)
  const ITEMS_PER_PAGE = 6;

  const [currentPage, setCurrentPage] = useState(1);
  const RECORDINGS_PER_PAGE = 7;

  const [currentCalibrationPage, setCurrentCalibrationPage] = useState(1);
  const [showRecordingSelect, setShowRecordingSelect] = useState(false)
  const [selectOpen, setSelectOpen] = useState(false)
  
  const filteredAndSortedClasses = classes
  ?.map((cls) => {
    const annotationCount =
      calibrationRec?.reduce((total, cal) => {
        const countForThisCal =
          cal.annotations?.filter(
            (ann) => ann.simroom_class_id === cls.id
          ).length ?? 0;
        return total + countForThisCal;
      }, 0) ?? 0;

    return {
      ...cls,
      annotationCount,
    };
  })
  .filter((cls) =>
    cls.class_name.toLowerCase().includes(searchClassName.toLowerCase())
  )
  .sort((a, b) => a.annotationCount - b.annotationCount); 

  const totalPages = Math.ceil(filteredAndSortedClasses.length / ITEMS_PER_PAGE);

  const paginatedClasses = filteredAndSortedClasses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalCalibrationPages = Math.ceil(
    calibrationRec.length / RECORDINGS_PER_PAGE
  );

  const paginatedCalibrationRec = calibrationRec.slice(
    (currentCalibrationPage - 1) * RECORDINGS_PER_PAGE,
    currentCalibrationPage * RECORDINGS_PER_PAGE
  );

  const handleAddCalibration = async () => {
    if (!selectedRecordingId) return
    try {
      await onAddCalibrationRecording(
        String(selectedRecordingId)
      )
      setSelectedRecordingId("")
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to add calibration recording")
    }
  }
  if (viewingClass) {
    const simClass = classes.find(c => c.id === viewingClass.classId);
    if (!simClass) return null;

    return (
      <AnnotationViewer
        calibrationRec={calibrationRec}
        simClass={simClass}
        onBack={async () => {
          await handleAnnotationsChanged(); 
          setViewingClass(null);            
        }}
      />
    );
  }

  return (
    <div className="bg-[#F4F9FC] p-10 space-y-12 min-h-screen">
      <div>
        <h1 className="text-4xl font-bold text-[#16B0A5] tracking-tight">
          Voorwerpen calibreren
        </h1>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
        {/* CLASSES / SIMULATIE VOORWERPEN */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden xl:col-span-6 flex flex-col">
          <CardHeader className="bg-[#16B0A5] text-white">
            <CardTitle>Simulatie voorwerpen</CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-4 flex flex-col flex-1 overflow-hidden">

            {/* ADD NEW CLASS AT TOP */}
            <div className="space-y-1">
              <Input
                placeholder="Naam nieuw voorwerp"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && newClassName.trim()) {
                    await onAddClass(newClassName);
                    setNewClassName("");
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Druk op <strong>Enter</strong> om toe te voegen.
              </p>
            </div>
            <Separator className="h-[2px]"/>

            {/* SEARCH */}
            <Input
              placeholder="Zoek voorwerp..."
              value={searchClassName}
              onChange={(e) => {
                setSearchClassName(e.target.value);
                setCurrentPage(1); // reset page when searching
              }}
            />

            {/* LIST */}
              <div className="space-y-2">

                {paginatedClasses.map((cls) => {
                  const isNotCalibrated = cls.annotationCount < 5;

                  return (
                    <div
                      key={cls.id}
                      onClick={() =>
                        setViewingClass({ classId: cls.id, className: cls.class_name })
                      }
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition",
                        isNotCalibrated
                          ? "bg-red-50 border-red-300 hover:bg-red-100"
                          : "bg-white border-slate-200 hover:bg-[#F4F9FC]"
                      )}
                    >
                      <div>
                        <span
                          className={cn(
                            "font-medium",
                            isNotCalibrated && "text-red-600"
                          )}
                        >
                          {cls.class_name}
                        </span>
                        <p
                          className={cn(
                            "text-xs",
                            isNotCalibrated ? "text-red-500" : "text-gray-500"
                          )}
                        >
                          References: {cls.annotationCount}
                        </p>
                      </div>

                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              `Ben je zeker dat je "${cls.class_name}" wilt verwijderen?`
                            )
                          ) {
                            onDeleteClass(cls.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="flex justify-center pt-4">
                <Pagination>
                  <PaginationContent>

                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentPage((p) => Math.max(p - 1, 1))
                        }
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }).map((_, index) => (
                      <PaginationItem key={index}>
                        <PaginationLink
                          isActive={currentPage === index + 1}
                          onClick={() => setCurrentPage(index + 1)}
                        >
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((p) =>
                            Math.min(p + 1, totalPages)
                          )
                        }
                      />
                    </PaginationItem>

                  </PaginationContent>
                </Pagination>
              </div>
            )}

          </CardContent>
        </Card>


        {/* CALIBRATION RECORDINGS */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden xl:col-span-6 flex flex-col">
          <CardHeader className="bg-[#F4A261] text-white">
            <CardTitle>Calibratie opnames</CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-4 flex flex-col flex-1 overflow-hidden">
              <div className="mb-2">
                {!showRecordingSelect ? (
                  <Button
                    onClick={() => setShowRecordingSelect(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Opname toevoegen
                  </Button>
                ) : (
                  <Select
                    onValueChange={async (value) => {
                      try {
                        await onAddCalibrationRecording(value)
                        setShowRecordingSelect(false)
                      } catch (err: any) {
                        setError(err.message || "Failed to add calibration recording")
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Kies een opname" />
                    </SelectTrigger>

                    <SelectContent>
                      {recordings.map((rec) => (
                        <SelectItem
                          key={rec.id}
                          value={rec.id.toString()}
                        >
                          {rec.participant} -{" "}
                          {new Date(rec.created).toLocaleString("nl-BE", {
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
                )}
              </div>

              {calibrationRec &&
                calibrationRec.length === 0 && (
                    <p className="text-center text-sm text-[#F4A261]/80">
                    Nog geen calibartie opnames toegevoegd
                  </p>
                )}

              <div className="space-y-2">
                {paginatedCalibrationRec.map((cal) => {
                   const uniqueClassIds = Array.from(
                  new Set(
                    cal.annotations?.map((ann) => ann.simroom_class_id) ?? []
                  )
                )

                const uniqueClasses = uniqueClassIds
                  .map((id) => classes.find((cls) => cls.id === id))
                  .filter(Boolean)

                  return (
                    <HoverCard key={cal.id} openDelay={200}>
                      <HoverCardTrigger asChild>
                        <div
                          className={cn(
                            "flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-[#F4F9FC] transition cursor-pointer"
                          )}
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
                              className="cursor-pointer"
                              disabled={loadingLabeling !== null}
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  setLoadingLabeling(cal.id)
                                  await onStartLabeling(cal.id)
                                } finally {
                                  setLoadingLabeling(null)
                                }
                              }}
                            >
                              {loadingLabeling === cal.id ? (
                                <Loader2 className="animate-spin h-4 w-4" />
                              ) : (
                                 "Start Labeling"
                              )}
                            </Button>

                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm("Deze calibratie opname verwijderen?")) {
                                  onDeleteCalibrationRecording(cal.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </HoverCardTrigger>

                      <HoverCardContent className="w-64">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">
                            Geannoteerde voorwerpen
                          </p>

                          {uniqueClasses.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {uniqueClasses.map((cls) => (
                                <span
                                  key={cls!.id}
                                  className="text-xs px-2 py-1 rounded-full bg-[#F4A261]/20 text-[#F4A261] font-medium"
                                >
                                  {cls!.class_name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Geen annotaties
                            </p>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  )
                })}
              </div>
            {totalCalibrationPages > 1 && (
              <div className="flex justify-center pt-4">
                <Pagination>
                  <PaginationContent>

                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentCalibrationPage((p) => Math.max(p - 1, 1))
                        }
                      />
                    </PaginationItem>

                    {Array.from({ length: totalCalibrationPages }).map((_, index) => (
                      <PaginationItem key={index}>
                        <PaginationLink
                          isActive={currentCalibrationPage === index + 1}
                          onClick={() => setCurrentCalibrationPage(index + 1)}
                        >
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentCalibrationPage((p) =>
                            Math.min(p + 1, totalCalibrationPages)
                          )
                        }
                      />
                    </PaginationItem>

                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
