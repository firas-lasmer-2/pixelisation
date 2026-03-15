import type { Area } from "react-easy-crop";
import type { KitSize } from "@/lib/store";
import type { ImageAdjustments } from "@/lib/aiPhotoEdits";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CropScreen } from "@/components/CropScreen";
import { Camera } from "lucide-react";

interface AiPhotoCropDialogProps {
  open: boolean;
  imageSrc: string;
  kitSize: KitSize;
  photoIndex: number;
  totalPhotos: number;
  label: string;
  initialAdjustments?: ImageAdjustments;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
  onCropComplete: (croppedArea: Area, adjustments: ImageAdjustments) => void;
}

export function AiPhotoCropDialog({
  open,
  imageSrc,
  kitSize,
  photoIndex,
  totalPhotos,
  label,
  initialAdjustments,
  onOpenChange,
  onBack,
  onCropComplete,
}: AiPhotoCropDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[min(100vw-1.5rem,900px)] p-0 overflow-hidden gap-0 rounded-[24px] border-black/[0.08]"
        onInteractOutside={(event) => event.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Camera className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            {totalPhotos > 1 && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
                Photo {photoIndex + 1} sur {totalPhotos}
              </p>
            )}
            <p className="text-[15px] font-bold text-foreground leading-tight">{label}</p>
          </div>
          {totalPhotos > 1 && (
            <div className="ml-auto flex gap-1 shrink-0">
              {Array.from({ length: totalPhotos }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-6 rounded-full transition-colors ${i === photoIndex ? "bg-primary" : "bg-black/10"}`}
                />
              ))}
            </div>
          )}
        </div>

        <CropScreen
          imageSrc={imageSrc}
          kitSize={kitSize}
          onCropComplete={onCropComplete}
          onBack={onBack}
          initialAdjustments={initialAdjustments}
          hideKitBadge
          submitLabel={
            totalPhotos > 1 && photoIndex < totalPhotos - 1
              ? "Photo suivante →"
              : "Confirmer le recadrage"
          }
        />
      </DialogContent>
    </Dialog>
  );
}
