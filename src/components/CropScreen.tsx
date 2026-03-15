import { useState, useCallback, useEffect, useRef } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  CheckCircle2, AlertTriangle, Shield, RotateCw, ZoomIn, Sun, Contrast,
} from "lucide-react";
import { GRID_CONFIG, type KitSize } from "@/lib/imageProcessing";
import { PROCESSING_KIT_META } from "@/lib/kitCatalog";
import type { ImageAdjustments } from "@/lib/aiPhotoEdits";

interface CropScreenProps {
  imageSrc: string;
  kitSize: KitSize;
  onCropComplete: (croppedArea: Area, adjustments: ImageAdjustments) => void;
  onBack?: () => void;
  submitLabel?: string;
  freeCrop?: boolean;
  hideKitBadge?: boolean;
  initialAdjustments?: ImageAdjustments;
}

function getQualityInfo(w: number, h: number, kitSize: KitSize) {
  const meta = PROCESSING_KIT_META[kitSize];
  const min = { w: meta.gridCols, h: meta.gridRows };
  if (w >= min.w * 4 && h >= min.h * 4)
    return { level: "excellent" as const, label: "Qualité excellente", percent: 100 };
  if (w >= min.w * 2 && h >= min.h * 2)
    return { level: "good" as const, label: "Bonne qualité", percent: 66 };
  return { level: "low" as const, label: "Qualité insuffisante — dézoomez", percent: 25 };
}

export function CropScreen({
  imageSrc,
  kitSize,
  onCropComplete,
  onBack,
  submitLabel,
  freeCrop = false,
  hideKitBadge = false,
  initialAdjustments,
}: CropScreenProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(initialAdjustments?.brightness ?? 100);
  const [contrast, setContrast] = useState(initialAdjustments?.contrast ?? 100);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [hdPreview, setHdPreview] = useState<string | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const kitMeta = PROCESSING_KIT_META[kitSize];
  const aspect = freeCrop ? undefined : kitMeta.aspectRatio;
  const gridConfig = GRID_CONFIG[kitSize];

  const onCropDone = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setBrightness(initialAdjustments?.brightness ?? 100);
    setContrast(initialAdjustments?.contrast ?? 100);
    setCroppedAreaPixels(null);
    setHdPreview(null);
  }, [imageSrc, initialAdjustments]);

  const handleRotate = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
  }, []);

  // Generate HD preview with debounce
  useEffect(() => {
    if (!croppedAreaPixels) return;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const { x, y, width, height } = croppedAreaPixels;
          const canvas = document.createElement("canvas");
          const displayW = 320;
          const displayH = Math.round(displayW * (height / width));
          canvas.width = displayW;
          canvas.height = displayH;
          const ctx = canvas.getContext("2d")!;
          ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, x, y, width, height, 0, 0, displayW, displayH);
          setHdPreview(canvas.toDataURL("image/jpeg", 0.92));
        } catch {}
      };
      img.src = imageSrc;
    }, 200);
    return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current); };
  }, [croppedAreaPixels, imageSrc, brightness, contrast]);

  const quality = croppedAreaPixels
    ? getQualityInfo(croppedAreaPixels.width, croppedAreaPixels.height, kitSize)
    : null;

  const qualityColor =
    quality?.level === "excellent" ? "bg-green-500" :
    quality?.level === "good"      ? "bg-amber-400" :
    quality?.level === "low"       ? "bg-red-500"   : "bg-muted";

  return (
    <div className="flex flex-col overflow-hidden">
      {/* ── Main area: cropper + side panel ── */}
      <div className="flex flex-col lg:flex-row">

        {/* LEFT: Crop canvas */}
        <div className="relative flex-1 bg-[#111] min-h-[300px] lg:min-h-[440px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropDone}
          />
          {/* eslint-disable-next-line react/no-danger */}
          <style dangerouslySetInnerHTML={{ __html: `.reactEasyCrop_Image { filter: brightness(${brightness}%) contrast(${contrast}%); }` }} />

          {/* Quality badge overlay */}
          {quality && (
            <div className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-lg ${qualityColor}`}>
              {quality.level === "excellent" && <Shield className="h-3 w-3" />}
              {quality.level === "good"      && <CheckCircle2 className="h-3 w-3" />}
              {quality.level === "low"       && <AlertTriangle className="h-3 w-3" />}
              {quality.label}
            </div>
          )}

          {/* Kit badge */}
          {!hideKitBadge && (
            <div className="absolute top-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              {kitMeta.label} — {gridConfig.cols}×{gridConfig.rows}
            </div>
          )}
        </div>

        {/* RIGHT: Controls panel */}
        <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-black/[0.06] bg-white flex flex-col divide-y divide-black/[0.04]">

          {/* Zoom */}
          <div className="px-5 py-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Zoom</span>
              </div>
              <span className="text-[11px] font-mono text-foreground">{zoom.toFixed(1)}×</span>
            </div>
            <div className="flex items-center gap-2">
              <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={([v]) => setZoom(v)} className="flex-1" />
              <Button
                variant="outline"
                size="icon"
                onClick={handleRotate}
                className="h-8 w-8 shrink-0 border-black/[0.08]"
                title="Rotation 90°"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Brightness */}
          <div className="px-5 py-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Lumière</span>
              </div>
              <span className="text-[11px] font-mono text-foreground">{brightness}%</span>
            </div>
            <Slider min={50} max={150} step={1} value={[brightness]} onValueChange={([v]) => setBrightness(v)} />
          </div>

          {/* Contrast */}
          <div className="px-5 py-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Contrast className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Contraste</span>
              </div>
              <span className="text-[11px] font-mono text-foreground">{contrast}%</span>
            </div>
            <Slider min={50} max={150} step={1} value={[contrast]} onValueChange={([v]) => setContrast(v)} />
          </div>

          {/* Preview */}
          {hdPreview && (
            <div className="px-5 py-4 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Aperçu</span>
              <div className="overflow-hidden rounded-xl border border-black/[0.06]">
                <img src={hdPreview} alt="Aperçu recadré" className="w-full h-auto" />
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="px-5 py-4 space-y-1.5 text-[11px] text-muted-foreground/70 flex-1">
            <p className="font-semibold text-muted-foreground">Conseils :</p>
            <p>• Centrez le visage dans le cadre</p>
            <p>• Évitez les fonds chargés</p>
            <p>• Dézoomez pour capturer plus de détails</p>
          </div>
        </div>
      </div>

      {/* ── Bottom action bar ── */}
      <div className="border-t border-black/[0.06] bg-white px-5 py-4 flex items-center gap-3">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="gap-1.5 border-black/[0.08]">
            Annuler
          </Button>
        )}
        <Button
          className="flex-1 gap-2 btn-premium text-primary-foreground border-0 h-11 font-semibold"
          onClick={() => {
            if (croppedAreaPixels) onCropComplete(croppedAreaPixels, { brightness, contrast });
          }}
          disabled={!croppedAreaPixels || quality?.level === "low"}
        >
          <CheckCircle2 className="w-4 h-4" />
          {submitLabel ?? "Confirmer le recadrage"}
        </Button>
      </div>
    </div>
  );
}
