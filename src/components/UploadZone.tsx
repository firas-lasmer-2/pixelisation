import { useCallback, useState } from "react";
import { Upload, User, Heart, Camera, Info, ImageIcon, Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n";
import { optimizeOrderImageSource } from "@/lib/orderImage";

interface UploadZoneProps {
  onImageSelected: (dataUrl: string) => void;
}

const SAMPLE_PHOTOS = [
  "/images/style-original.jpg",
  "/images/style-vintage.jpg",
  "/images/style-popart.jpg",
];

export function UploadZone({ onImageSelected }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useTranslation();

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const optimized = await optimizeOrderImageSource(file);
      onImageSelected(optimized);
    },
    [onImageSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  const handleSampleClick = async (url: string) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const optimized = await optimizeOrderImageSource(blob);
      onImageSelected(optimized);
    } catch {
      // If fetch fails, just use the URL directly as a data source
      onImageSelected(url);
    }
  };

  const tips = [
    { icon: User, label: t.studio.upload?.tipPortrait || "Portraits" },
    { icon: Heart, label: t.studio.upload?.tipCouple || "Couples" },
    { icon: Camera, label: t.studio.upload?.tipPet || "Animaux" },
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Upload zone with animated gradient border */}
      <label
        className={`relative flex flex-col items-center justify-center w-full h-72 sm:h-80 rounded-2xl cursor-pointer transition-all duration-300 group overflow-hidden ${
          isDragging ? "scale-[1.02]" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Animated gradient background */}
        <div className={`absolute inset-0 rounded-2xl ${isDragging ? "upload-zone-gradient" : ""}`} />
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: isDragging
              ? "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.15))"
              : "linear-gradient(135deg, hsl(var(--muted) / 0.5), hsl(var(--background)))",
            border: "2px dashed",
            borderColor: isDragging ? "hsl(var(--primary))" : "hsl(var(--border))",
          }}
        />

        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        
        {/* Animated rings */}
        <div className="relative z-10">
          <div className={`absolute inset-0 rounded-full bg-primary/10 transition-transform duration-700 ${isDragging ? "scale-[2] opacity-100" : "scale-100 opacity-0 group-hover:scale-[1.8] group-hover:opacity-50"}`} />
          <div className={`relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-300 ${isDragging ? "scale-110 bg-primary/20" : "group-hover:bg-primary/15"}`}>
            <Upload className={`w-8 h-8 text-primary transition-transform duration-300 ${isDragging ? "-translate-y-1" : "group-hover:-translate-y-0.5"}`} />
          </div>
        </div>
        
        <div className="text-center mt-4 relative z-10">
          <p className="font-semibold text-lg">{t.studio.upload?.dropHere || "Déposez votre photo ici"}</p>
          <p className="text-muted-foreground text-sm mt-1">{t.studio.upload?.orBrowse || "ou cliquez pour parcourir"}</p>
        </div>

        {/* Supported formats */}
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground/70 relative z-10">
          <ImageIcon className="h-3 w-3" />
          <span>JPG, PNG, WebP</span>
        </div>
      </label>

      {/* Sample photos */}
      <div className="w-full">
        <p className="text-xs font-medium text-muted-foreground text-center mb-3 flex items-center justify-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          {t.studio.upload?.trySample || "Essayer un exemple"}
        </p>
        <div className="flex justify-center gap-3">
          {SAMPLE_PHOTOS.map((photo, i) => (
            <button
              key={i}
              onClick={() => handleSampleClick(photo)}
              className="w-16 h-16 rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              <img src={photo} alt={`Sample ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Tips and quality info */}
      <div className="w-full grid gap-3 sm:grid-cols-2">
        {/* Photo tips */}
        <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground w-full text-center mb-1">
            {t.studio.uploadTips?.bestFor || "Fonctionne mieux avec"}
          </p>
          {tips.map((tip, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <tip.icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <span>{tip.label}</span>
            </div>
          ))}
        </div>

        {/* Quality tip */}
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
          <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <Info className="h-3.5 w-3.5 text-accent" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{t.studio.uploadTips?.qualityTitle || "Conseil qualité"}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t.studio.uploadTips?.qualityDesc || "Utilisez une photo nette avec un bon éclairage. Résolution recommandée : 1 MP minimum."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
