import React, { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { SimRoom, SimRoomClass, Annotation, CalibrationRecording } from "../types/simrooms";
import { LabelingAPI } from "../api/labelingApi";
import { Trash2 } from "lucide-react";

type Props = {
  calibrationRec: CalibrationRecording[];
  simClass: SimRoomClass;
  onBack: () => void;
};

export default function AnnotationViewer({ calibrationRec,simClass, onBack }: Props) {
  const initialAnnotations: Annotation[] = useMemo(() => {
    return (
      calibrationRec?.flatMap((cal) =>
        cal.annotations?.filter(
          (ann) => ann.simroom_class_id === simClass.id
        ) || []
      ) || []
    );
  }, [simClass, calibrationRec]);

  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations)
  
  useEffect(() => {
  setAnnotations(initialAnnotations);
}, [initialAnnotations]);

  const handleClickThumbnail = (frameIndex: number) => {
    setSelectedFrame(frameIndex);
  };

  const handleDeleteAnnotation = async (annId: number) => {
    const confirmed = window.confirm(
      "Weet je zeker dat je deze annotatie wilt verwijderen?"
    );

    if (!confirmed) return;

    setAnnotations((prev) => prev.filter((a) => a.id !== annId));

    try {
      await LabelingAPI.deleteAnnotation(annId);
    } catch (err) {
      console.error("Failed to delete annotation", err);

      const updated = await LabelingAPI.getAnnotations();
      setAnnotations(updated);
    }
  };

  return (
    <div className="space-y-6 bg-[#F4F9FC] p-6 rounded-2xl">
      {/* BACK BUTTON LINKSBOVEN */}
      <div className="flex justify-start">
        <Button
          size="lg"
          className="bg-[#4CA2D5] hover:bg-[#3A91C1] text-white"
          onClick={onBack}
        >
          Terug
        </Button>
      </div>

      <h2 className="text-2xl font-bold text-[#333]">{simClass.class_name} - references</h2>

      {annotations.length === 0 ? (
        <p className="text-sm text-gray-500">Geen references voor dit voorwerp</p>
      ) : (
        <ScrollArea className="max-h-[600px] overflow-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {annotations.map((ann) => (
                <Card
                key={ann.id}
                className={`group relative overflow-hidden p-1 transition-all hover:shadow-md ${
                    selectedFrame === ann.frame_idx ? "ring-2 ring-primary" : ""
                }`}
                >
                {/* IMAGE FULL VIEW */}
                <img
                    src={`data:image/png;base64,${ann.frame_crop_base64}`}
                    alt={`Frame ${ann.frame_idx}`}
                    className="w-full h-auto max-h-[300px] object-contain rounded-md cursor-pointer transition-opacity hover:opacity-90"
                    onClick={() => handleClickThumbnail(ann.frame_idx)}
                />

                <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                    onClick={() => handleDeleteAnnotation(ann.id)}
                >
                  <Trash2 className="h-4 w-4" />

                </Button>
                </Card>
            ))}
            </div>
        </ScrollArea>
      )}
    </div>
  );
}