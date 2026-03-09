import { useState, useCallback } from "react";
import { Area } from "react-easy-crop";
import { UploadZone } from "@/components/UploadZone";
import { CropScreen } from "@/components/CropScreen";
import { ProcessingScreen } from "@/components/ProcessingScreen";
import { ResultsScreen } from "@/components/ResultsScreen";
import { processImage, ProcessingResult, KitSize } from "@/lib/imageProcessing";

type Screen = "upload" | "crop" | "processing" | "results";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("upload");
  const [imageSrc, setImageSrc] = useState<string>("");
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [kitSize] = useState<KitSize>("40x50");

  const handleImageSelected = useCallback((dataUrl: string) => {
    setImageSrc(dataUrl);
    setScreen("crop");
  }, []);

  const handleCropComplete = useCallback(
    async (croppedArea: Area) => {
      setScreen("processing");
      try {
        const r = await processImage(imageSrc, croppedArea, kitSize);
        setResults(r);
        setScreen("results");
      } catch (err) {
        console.error("Processing failed:", err);
        setScreen("crop");
      }
    },
    [imageSrc, kitSize]
  );

  const handleReset = useCallback(() => {
    setImageSrc("");
    setResults([]);
    setScreen("upload");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {screen === "upload" && <UploadZone onImageSelected={handleImageSelected} />}
      {screen === "crop" && (
        <CropScreen
          imageSrc={imageSrc}
          kitSize={kitSize}
          onCropComplete={handleCropComplete}
          onBack={() => setScreen("upload")}
        />
      )}
      {screen === "processing" && <ProcessingScreen />}
      {screen === "results" && (
        <ResultsScreen results={results} onReset={handleReset} />
      )}
    </div>
  );
};

export default Index;
