import { useState } from "react";
import { ProcessingResult } from "@/lib/imageProcessing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Check, Download } from "lucide-react";

interface ResultsScreenProps {
  results: ProcessingResult[];
  onReset: () => void;
}

export function ResultsScreen({ results, onReset }: ResultsScreenProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleDownload = (result: ProcessingResult) => {
    const link = document.createElement("a");
    link.download = `pixel-portrait-${result.styleKey}.png`;
    link.href = result.dataUrl;
    link.click();
  };

  return (
    <div className="px-4 py-8 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Your Pixel Portraits</h2>
        <p className="text-muted-foreground">Click a style to select it</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {results.map((result) => {
          const isSelected = selected === result.styleKey;
          return (
            <Card
              key={result.styleKey}
              className={`cursor-pointer transition-all duration-200 overflow-hidden ${
                isSelected
                  ? "ring-2 ring-primary shadow-lg scale-[1.02]"
                  : "hover:shadow-md hover:scale-[1.01]"
              }`}
              onClick={() => setSelected(result.styleKey)}
            >
              <CardContent className="p-0">
                <div className="relative">
                  <img
                    src={result.dataUrl}
                    alt={`${result.palette.name} preview`}
                    className="w-full aspect-[4/5] object-cover"
                    style={{ imageRendering: "pixelated" }}
                  />
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Check className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-lg">{result.palette.name}</h3>
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(result);
                        }}
                        className="text-primary hover:text-primary/80 transition-colors"
                        title="Download PNG"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs mb-3">
                    {result.palette.description}
                  </p>

                  {/* Color swatches */}
                  <div className="flex flex-wrap gap-1.5">
                    {result.palette.colors.map((color) => (
                      <div key={color.hex} className="flex flex-col items-center gap-0.5">
                        <div
                          className="w-6 h-6 rounded-md border border-border shadow-sm"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                        <span className="text-[9px] text-muted-foreground leading-none max-w-[32px] text-center truncate">
                          {color.name.split(" ").pop()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center mt-8">
        <Button variant="outline" size="lg" onClick={onReset} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try another photo
        </Button>
      </div>
    </div>
  );
}

