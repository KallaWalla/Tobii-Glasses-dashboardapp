// Dashboard.tsx
import { useEffect, useState } from "react";
import { RecordingsAPI } from "../api/recordingsApi";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2 } from "lucide-react";
import { Recording } from "../types/recording";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

export default function Dashboard() {
  const [localRecordings, setLocalRecordings] = useState<Recording[]>([]);
  const [glassesRecordings, setGlassesRecordings] = useState<Recording[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingGlasses, setLoadingGlasses] = useState(false);
  const [glassesError, setGlassesError] = useState<string | null>(null);

  const fetchLocal = async () => {
    setLoadingLocal(true);
    try {
      const data = await RecordingsAPI.getLocal();
      setLocalRecordings(data);
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

  return (
    <div className="bg-[#F4F9FC] p-10 space-y-12">

      {/* PAGE TITLE */}
      <div>
        <h1 className="text-4xl font-bold text-[#4CA2D5] tracking-tight">
          Dashboard
        </h1>
        <h2 className="text-gray-600 mt-1">
          Beheer je opnames: verwijder opnames van de computer of download opnames van de Tobii-bril. 
          Controleer bij verbindingsproblemen of je apparaat verbonden is met de bril via Wifi.
        </h2>
      </div>

      {/* ================= LOCAL RECORDINGS ================= */}
      <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
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
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F4F9FC]">
                    <TableHead>Naam</TableHead>
                    <TableHead>Datum en Tijd</TableHead>
                    <TableHead>Duur</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localRecordings.map((rec) => (
                    <TableRow key={rec.id} className="hover:bg-[#F4F9FC] transition">
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
                          className="bg-black hover:bg-gray-800 text-white"
                          onClick={() => handleDeleteLocal(rec.id)}
                        >
                          verwijderen
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

      {/* ================= GLASSES RECORDINGS ================= */}
      <Card className="shadow-xl border-0 rounded-2xl overflow-hidden">
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
            <div className="rounded-xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F0FBF9]">
                    <TableHead>Naam</TableHead>
                    <TableHead>Datum en Tijd</TableHead>
                    <TableHead>Duur</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {glassesRecordings.map((rec) => (
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

    </div>
  )
}