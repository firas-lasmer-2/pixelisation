import { useCallback } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { optimizeOrderImageSource } from "@/lib/orderImage";

interface MultiUploadZoneProps {
  photos: string[];
  maxPhotos: number;
  onPhotoAdded: (dataUrl: string, index: number) => void;
  onPhotoRemoved: (index: number) => void;
  labels?: string[];
}

export function MultiUploadZone({ photos, maxPhotos, onPhotoAdded, onPhotoRemoved, labels }: MultiUploadZoneProps) {
  const handleFile = useCallback(async (file: File, index: number) => {
    if (!file.type.startsWith("image/")) return;
    const optimized = await optimizeOrderImageSource(file);
    onPhotoAdded(optimized, index);
  }, [onPhotoAdded]);

  return (
    <div className={`grid gap-4 ${maxPhotos === 2 ? "sm:grid-cols-2" : ""}`}>
      {Array.from({ length: maxPhotos }).map((_, i) => {
        const photo = photos[i];
        const label = labels?.[i] || `Photo ${i + 1}`;

        return (
          <div key={i} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            {photo ? (
              <div className="relative group">
                <div className="overflow-hidden rounded-xl border-2 border-primary/20 shadow-lg bg-card p-2">
                  <img src={photo} alt={label} className="w-full max-h-64 object-contain rounded-lg" />
                </div>
                <button
                  onClick={() => onPhotoRemoved(i)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 group">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file, i);
                  }}
                />
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/15 transition-colors">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium">Ajouter {label.toLowerCase()}</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                  <ImageIcon className="h-2.5 w-2.5" />
                  <span>JPG, PNG, WebP</span>
                </div>
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
