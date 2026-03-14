import { useState, useCallback, useEffect, useRef } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Crop, ArrowLeft, Sparkles, AlertTriangle, CheckCircle2,
  Shield, RotateCw, Lightbulb, ChevronDown, ZoomIn, Eye,
} from "lucide-react";
import { useTranslation } from "@/i18n";
import { GRID_CONFIG, type KitSize } from "@/lib/imageProcessing";
import { PROCESSING_KIT_META } from "@/lib/kitCatalog";

interface CropScreenProps {
  imageSrc: string;
  kitSize: KitSize;
  onCropComplete: (croppedArea: Area, adjustments: { brightness: number; contrast: number }) => void;
  onBack: () => void;
  submitLabel?: string;
  freeCrop?: boolean;
  hideKitBadge?: boolean;
}

function getQualityInfo(w: number, h: number, kitSize: KitSize) {
  const meta = PROCESSING_KIT_META[kitSize];
  const min = { w: meta.gridCols, h: meta.gridRows };
  if (w >= min.w * 4 && h >= min.h * 4)
    return { level: "excellent" as const, label: "Excellente qualité", percent: 100, color: "text-green-500", bgColor: "bg-green-500" };
  if (w >= min.w * 2 && h >= min.h * 2)
    return { level: "good" as const, label: "Bonne qualité", percent: 66, color: "text-amber-500", bgColor: "bg-amber-500" };
  return { level: "low" as const, label: "Qualité insuffisante", percent: 25, color: "text-destructive", bgColor: "bg-destructive" };
}

export function CropScreen({ imageSrc, kitSize, onCropComplete, onBack, submitLabel, freeCrop = false, hideKitBadge = false }: CropScreenProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [hdPreview, setHdPreview] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation();

  const kitMeta = PROCESSING_KIT_META[kitSize];
  const aspect = freeCrop ? undefined : kitMeta.aspectRatio;
  const gridConfig = GRID_CONFIG[kitSize];

  const onCropDone = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

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
          const displayW = 400;
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

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [croppedAreaPixels, imageSrc, brightness, contrast]);

  const quality = croppedAreaPixels
    ? getQualityInfo(croppedAreaPixels.width, croppedAreaPixels.height, kitSize)
    : null;

  const cropT = t.studio.crop || ({} as any);

  return (
    <div className="flex flex-col items-center min-h-[80vh] px-4 py-8">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {t.studio.back}
          </button>
          {!hideKitBadge && (
            <Badge variant="secondary" className="text-xs font-medium">
              {kitMeta.label} — {gridConfig.cols}×{gridConfig.rows} blocs
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10">
            <Crop className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{cropT.title || "Recadrez votre photo"}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {cropT.subtitle || "Ajustez le cadrage pour un résultat optimal"}
            </p>
          </div>
        </div>

        {/* Main cropper card */}
        <Card className="glass-card overflow-hidden border-border/50 shadow-lg">
          <CardContent className="p-0">
            <div className="relative w-full h-[420px] md:h-[480px] bg-foreground/5">
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
              <style dangerouslySetInnerHTML={{ __html: `.reactEasyCrop_Image { filter: brightness(${brightness}%) contrast(${contrast}%); }` }} />
            </div>

            {/* Controls bar */}
            <div className="px-5 py-4 border-t border-border/50 bg-card/60 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[50px]">
                  <ZoomIn className="h-4 w-4 text-primary" />
                  <span>{cropT.zoom || "Zoom"}</span>
                </div>
                <Slider
                  min={1}
                  max={3}
                  step={0.05}
                  value={[zoom]}
                  onValueChange={([v]) => setZoom(v)}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground font-mono min-w-[32px] text-right">
                  {zoom.toFixed(1)}×
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRotate}
                  className="h-9 w-9 shrink-0"
                  title="Rotation 90°"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[50px]">
                  <span>Lumière</span>
                </div>
                <Slider
                  min={50}
                  max={150}
                  step={1}
                  value={[brightness]}
                  onValueChange={([v]) => setBrightness(v)}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground font-mono min-w-[32px] text-right">
                  {brightness}%
                </span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[50px] ml-4">
                  <span>Contraste</span>
                </div>
                <Slider
                  min={50}
                  max={150}
                  step={1}
                  value={[contrast]}
                  onValueChange={([v]) => setContrast(v)}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground font-mono min-w-[32px] text-right">
                  {contrast}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quality + Preview row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quality meter */}
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Qualité de l'image</span>
                {quality && (
                  <Badge
                    variant={quality.level === "low" ? "destructive" : "secondary"}
                    className="gap-1"
                  >
                    {quality.level === "excellent" && <Shield className="h-3 w-3" />}
                    {quality.level === "good" && <CheckCircle2 className="h-3 w-3" />}
                    {quality.level === "low" && <AlertTriangle className="h-3 w-3" />}
                    {quality.label}
                  </Badge>
                )}
              </div>
              <Progress
                value={quality?.percent || 0}
                className="h-2"
              />
              {croppedAreaPixels && (
                <p className="text-xs text-muted-foreground">
                  {croppedAreaPixels.width} × {croppedAreaPixels.height} px
                  {quality?.level === "low" && " — Dézoomez pour capturer plus de détails"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* HD Preview */}
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              {hdPreview ? (
                <div className="relative">
                  <img
                    src={hdPreview}
                    alt="Aperçu du résultat"
                    className="w-full h-auto"
                  />
                  <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent">
                    <div className="flex items-center gap-1.5 text-[11px] text-white/90">
                      <Eye className="h-3 w-3" />
                      <span>Aperçu du résultat</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4 mr-2 opacity-50" />
                  Déplacez le cadre pour voir l'aperçu
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tips */}
        <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="font-medium">Conseils pour un meilleur résultat</span>
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${tipsOpen ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2 border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    Utilisez une photo bien éclairée avec un bon contraste
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    Centrez le sujet principal dans le cadre
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    Évitez les photos trop zoomées ou floues
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    Les portraits avec un arrière-plan simple donnent les meilleurs résultats
                  </li>
                </ul>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Generate button */}
        <Button
          size="lg"
          className="w-full gap-2 text-base btn-premium h-12"
          onClick={() => {
            if (croppedAreaPixels) onCropComplete(croppedAreaPixels, { brightness, contrast });
          }}
          disabled={!croppedAreaPixels || quality?.level === "low"}
        >
          {submitLabel ? <CheckCircle2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          {submitLabel || cropT.generate || "Générer l'aperçu"}
        </Button>
      </div>
    </div>
  );
}

