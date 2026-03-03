// Dashboard.tsx
import { useEffect, useState } from "react";
import { RecordingsAPI } from "../api/recordingsApi";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2, Trash2 } from "lucide-react";
import { Recording } from "../types/recording";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useNavigate } from "react-router-dom"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { CalibrationRecording } from "../types/simrooms";
import { CalibrationAPI } from "../api/calibrationsApi";

export default function Dashboard() {
  const [localRecordings, setLocalRecordings] = useState<Recording[]>([]);
  const [glassesRecordings, setGlassesRecordings] = useState<Recording[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingGlasses, setLoadingGlasses] = useState(false);
  const [glassesError, setGlassesError] = useState<string | null>(null);
  const navigate = useNavigate()
  const ITEMS_PER_PAGE = 10
  const [calibrationRecordings, setCalibrationRecordings] = useState<CalibrationRecording[]>([])

  const [localPage, setLocalPage] = useState(1)
  const [glassesPage, setGlassesPage] = useState(1)

  const fetchLocal = async () => {
    setLoadingLocal(true);
    try {
      const data = await RecordingsAPI.getLocal();
      setLocalRecordings(data);
      const calibrationRecordings = await CalibrationAPI.getCalibrationRecordings()
      setCalibrationRecordings(calibrationRecordings)
    } finally {
      setLoadingLocal(false);
    }
  };

  const fetchGlasses = async () => {
    setLoadingGlasses(true);
    setGlassesError(null);
    try {
      const data = await RecordingsAPI.getGlasses();
      setGlassesRecordings(data);
    } catch (err: any) {
      setGlassesError(
        err.response?.status === 503
          ? "Failed to connect to Tobii Glasses"
          : "Unexpected error occurred"
      );
    } finally {
      setLoadingGlasses(false);
    }
  };

  const handleDeleteLocal = async (id: string) => {
    setLoadingLocal(true);
    try {
      await RecordingsAPI.deleteLocal(id);
      await fetchLocal();
    } finally {
      setLoadingLocal(false);
    }
  };

  const handleDownload = async (id: string) => {
    setLoadingGlasses(true);
    try {
      await RecordingsAPI.downloadRecording(id);
      await fetchLocal();
    } finally {
      setLoadingGlasses(false);
    }
  };

  useEffect(() => {
    fetchLocal();
    fetchGlasses();
  }, []);
  const sortedLocalRecordings = [...localRecordings].sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  );

  const paginatedLocal = sortedLocalRecordings.slice(
    (localPage - 1) * ITEMS_PER_PAGE,
    localPage * ITEMS_PER_PAGE
  )

  const paginatedGlasses = glassesRecordings.slice(
    (glassesPage - 1) * ITEMS_PER_PAGE,
    glassesPage * ITEMS_PER_PAGE
  )

  const localTotalPages = Math.ceil(sortedLocalRecordings.length / ITEMS_PER_PAGE)
  const glassesTotalPages = Math.ceil(glassesRecordings.length / ITEMS_PER_PAGE)

  return (
    <div className="bg-[#F4F9FC] p-10 space-y-12">

      {/* PAGE TITLE */}
      <div>
        <h1 className="text-4xl font-bold text-[#16B0A5] tracking-tight">
          Stap 1
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Download jouw opnames van de Tobii-bril. Als jouw opname in de linker tabel staat heb je de stap succesvol afgerond.(Je kan in de linker tabel clicken op de opname om deze te bekijken)<br />
          Controleer bij verbindingsproblemen of je apparaat verbonden is met de bril via Wifi.<br />
          Na 7 dagen zullen de opnames verwijderd worden.
        </p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

      

        {/* ================= GLASSES RECORDINGS ================= */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden h-full">
          <CardHeader className="bg-[#16B0A5] text-white">
            <CardTitle>Opnames op de tobii bril</CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            {loadingGlasses && (
              <div className="flex items-center gap-2 mb-4 text-[#16B0A5]">
                <Loader2 className="animate-spin" />
                <span>Connecteren met Tobii bril...</span>
              </div>
            )}

            {glassesError && (
              <div className="border border-red-500 text-red-600 bg-red-50 p-4 rounded-xl mb-4">
                <p>{glassesError}</p>
                <Button
                  size="sm"
                  className="mt-3 bg-[#16B0A5] hover:bg-[#139488] text-black"
                  onClick={fetchGlasses}
                >
                  Opnieuw Connecteren
                </Button>
              </div>
            )}

            {!glassesError && glassesRecordings.length === 0 && !loadingGlasses && (
              <div className="bg-white border border-[#16B0A5]/30 rounded-xl p-6 text-center">
                <p className="font-semibold text-[#16B0A5]">
                  Geen opnames gevonden
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-[#16B0A5] hover:bg-[#139488] text-white"
                  onClick={fetchGlasses}
                >
                  Vernieuw opnames
                </Button>
              </div>
            )}

            {glassesRecordings.length > 0 && (
              <div className="rounded-xl border bg-white overflow-hidden bg-[#F0FBF9]">
                {glassesTotalPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setGlassesPage((p) => Math.max(p - 1, 1))}
                        />
                      </PaginationItem>

                      {Array.from({ length: glassesTotalPages }).map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={glassesPage === i + 1}
                            onClick={() => setGlassesPage(i + 1)}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setGlassesPage((p) => Math.min(p + 1, glassesTotalPages))
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white">
                      <TableHead>Naam</TableHead>
                      <TableHead>Datum en Tijd</TableHead>
                      <TableHead>Duur</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedGlasses.map((rec) => (
                      <TableRow key={rec.id} className="hover:bg-[#F0FBF9] transition">
                        <TableCell className="font-medium">{rec.participant}</TableCell>
                        <TableCell>
                          {new Date(rec.created).toLocaleString("nl-BE", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>{rec.duration.split(".")[0].slice(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="bg-[#16B0A5] hover:bg-[#139488] text-white"
                            onClick={() => handleDownload(rec.id)}
                          >
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================= LOCAL RECORDINGS ================= */}
        <Card className="shadow-xl border-0 rounded-2xl overflow-hidden h-full">
          <CardHeader className="bg-[#4CA2D5] text-white">
            <CardTitle>Opnames op de computer</CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            {loadingLocal && (
              <div className="flex items-center gap-2 mb-4 text-[#4CA2D5]">
                <Loader2 className="animate-spin" />
                <span>Laden computer opnames...</span>
              </div>
            )}

            {localRecordings.length === 0 && !loadingLocal && (
              <div className="bg-white border border-[#4CA2D5]/30 rounded-xl p-6 text-center">
                <p className="font-semibold text-[#4CA2D5]">
                  Geen opnames op de computer
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Download opnames van de bril beneden.
                </p>
              </div>
            )}

            {localRecordings.length > 0 && (
              <div className="rounded-xl border bg-white overflow-hidden">
                {localTotalPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setLocalPage((p) => Math.max(p - 1, 1))}
                        />
                      </PaginationItem>

                      {Array.from({ length: localTotalPages }).map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={localPage === i + 1}
                            onClick={() => setLocalPage(i + 1)}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setLocalPage((p) => Math.min(p + 1, localTotalPages))
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white">
                      <TableHead>Naam</TableHead>
                      <TableHead>Datum en Tijd</TableHead>
                      <TableHead>Duur</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLocal.filter(
                  (rec) =>
                    !calibrationRecordings.some((cal:CalibrationRecording) => cal.recording.id === rec.id)
                ).map((rec) => (
                      <TableRow
                        key={rec.id}
                        onClick={() => navigate(`/recordings/${rec.id}`)}
                        className="hover:bg-[#F4F9FC] transition cursor-pointer"
                      >
                          <TableCell className="font-medium">{rec.participant}</TableCell>
                        <TableCell>
                          {new Date(rec.created).toLocaleString("nl-BE", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>{rec.duration.split(".")[0].slice(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteLocal(rec.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}