import React, { useState } from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { SimRoom, SimRoomClass, Annotation } from "../types/simrooms";

type Props = {
  simRoom: SimRoom;
  simClass: SimRoomClass;
  onBack: () => void;
};

export default function AnnotationViewer({ simRoom, simClass, onBack }: Props) {
  const annotations: Annotation[] =
    simRoom.calibration_recordings?.flatMap((cal) =>
      cal.annotations?.filter((ann) => ann.simroom_class_id === simClass.id) || []
    ) || [];

  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);

  const handleClickThumbnail = (frameIndex: number) => {
    setSelectedFrame(frameIndex);
  };

  const handleDeleteAnnotation = (annId: number) => {
    if (confirm("Weet je zeker dat je deze annotatie wilt verwijderen?")) {
      // je kan hier een delete API call toevoegen als nodig
      console.log("Delete annotation", annId);
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
                    🗑
                </Button>
                </Card>
            ))}
            </div>
        </ScrollArea>
      )}
    </div>
  );
}