import { useEffect, useState } from "react";
import { RecordingsAPI } from "../api/recordingsApi";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Loader2 } from "lucide-react";
import { Recording } from "../types/recording";

function Dashboard() {
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
    } catch (err) {
      console.error("Error fetching local recordings:", err);
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
      if (err.response?.status === 503) {
        setGlassesError("Failed to connect to Tobii Glasses");
      } else {
        setGlassesError("Unexpected error occurred");
      }
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
    <div className="p-6 space-y-8">

      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* ================= LOCAL RECORDINGS ================= */}

      <Card>
        <CardHeader>
          <CardTitle>Local Recordings</CardTitle>
        </CardHeader>
        <CardContent>

          {loadingLocal && <Loader2 className="animate-spin mb-4" />}

          {localRecordings.length === 0 && !loadingLocal && (
            <div className="border rounded p-4 text-sm text-muted-foreground">
              <strong>No Local Recordings</strong>
              <p>
                Import recordings from Tobii Glasses using the table below.
              </p>
            </div>
          )}

          {localRecordings.length > 0 && (
            <table className="w-full text-sm border">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-2">Participant Name</th>
                  <th className="text-left p-2">Date and Time</th>
                  <th className="text-left p-2">Duration</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {localRecordings.map((rec) => (
                  <tr key={rec.id} className="border-b">
                    <td className="p-2">{rec.participant}</td>
                    <td className="p-2">
                      {new Date(rec.created).toLocaleString()}
                    </td>
                    <td className="p-2">{rec.duration}</td>
                    <td className="p-2 text-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteLocal(rec.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </CardContent>
      </Card>

      <Separator />

      {/* ================= GLASSES RECORDINGS ================= */}

      <Card>
        <CardHeader>
          <CardTitle>Recordings on Tobii Glasses</CardTitle>
        </CardHeader>
        <CardContent>

          {loadingGlasses && (
            <div className="flex items-center space-x-2 mb-4">
              <Loader2 className="animate-spin" />
              <span>Connecting to Tobii Glasses...</span>
            </div>
          )}

          {glassesError && (
            <div className="border border-red-500 text-red-500 p-3 rounded mb-4">
              {glassesError}
              <div className="mt-2">
                <Button size="sm" onClick={fetchGlasses}>
                  Retry Connection
                </Button>
              </div>
            </div>
          )}

          {!glassesError && glassesRecordings.length === 0 && !loadingGlasses && (
            <div>
              <p className="text-sm mb-2">
                There are currently no recordings on Tobii Glasses.
              </p>
              <Button size="sm" onClick={fetchGlasses}>
                Refresh Recordings
              </Button>
            </div>
          )}

          {!glassesError && glassesRecordings.length > 0 && (
            <table className="w-full text-sm border">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-2">Participant Name</th>
                  <th className="text-left p-2">Date and Time</th>
                  <th className="text-left p-2">Duration</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {glassesRecordings.map((rec) => (
                  <tr key={rec.id} className="border-b">
                    <td className="p-2">{rec.participant}</td>
                    <td className="p-2">
                      {new Date(rec.created).toLocaleString()}
                    </td>
                    <td className="p-2">{rec.duration}</td>
                    <td className="p-2 text-center">
                      <Button
                        size="sm"
                        onClick={() => handleDownload(rec.id)}
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
