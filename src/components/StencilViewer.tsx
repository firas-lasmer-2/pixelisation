import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaintingManifest } from "@/lib/paintingManifest";
import { GLITTER_PALETTES } from "@/lib/glitterPalettes";
import { STENCIL_DETAIL_META } from "@/lib/store";
import type { GlitterPalette, StencilDetailLevel } from "@/lib/store";
import { Eye, Paintbrush, Sparkles, Info } from "lucide-react";

interface StencilViewerProps {
  manifest: PaintingManifest;
}

const STENCIL_STEPS = [
  { title: "Déballez votre kit", desc: "Sortez délicatement la toile avec son pochoir adhésif déjà appliqué et les peintures fournies." },
  { title: "Préparez votre palette", desc: "Disposez vos couleurs de peinture. Vous pouvez les mélanger librement — aucune règle !" },
  { title: "Peignez librement", desc: "Appliquez la peinture sur toute la surface du pochoir. C'est votre création artistique !" },
  { title: "Laissez sécher", desc: "Attendez que la peinture soit complètement sèche (environ 20-30 minutes)." },
  { title: "Décollez le pochoir", desc: "En partant d'un coin, décollez lentement le pochoir adhésif. Le portrait blanc apparaît !" },
  { title: "Admirez votre œuvre !", desc: "Votre portrait personnel est révélé sur un fond artistique unique." },
];

const GLITTER_STEPS = [
  { title: "Déballez votre kit", desc: "Sortez délicatement la toile adhésive et les pots de paillettes de leur emballage." },
  { title: "Préparez votre espace", desc: "Posez la toile à plat sur une surface propre. Préparez vos pots de paillettes." },
  { title: "Saupoudrez les paillettes", desc: "Appliquez les paillettes en couche généreuse sur toute la surface. Faites attention aux bords." },
  { title: "Pressez doucement", desc: "Pressez légèrement avec la paume de la main pour faire adhérer les paillettes." },
  { title: "Retirez l'excédent", desc: "Inclinez doucement la toile pour faire tomber les paillettes en excès." },
  { title: "Décollez le pochoir", desc: "En partant d'un coin, décollez lentement le pochoir. Le portrait apparaît !" },
  { title: "Admirez votre œuvre !", desc: "Votre portrait scintillant est révélé. Partagez ce moment magique !" },
];

export function StencilViewer({ manifest }: StencilViewerProps) {
  const [imageTab, setImageTab] = useState<"stencil" | "source">("stencil");
  const isGlitter = manifest.productType === "glitter_reveal";
  const steps = isGlitter ? GLITTER_STEPS : STENCIL_STEPS;
  const glitterPalette = manifest.glitterPalette
    ? GLITTER_PALETTES[manifest.glitterPalette as GlitterPalette]
    : null;
  const detailLabel = manifest.stencilDetailLevel
    ? STENCIL_DETAIL_META[manifest.stencilDetailLevel as StencilDetailLevel]?.label
    : null;

  return (
    <div className="space-y-6">
      {/* Stencil Preview & Source Photo */}
      <Card>
        <CardContent className="p-4 md:p-6 space-y-4">
          <Tabs value={imageTab} onValueChange={(v) => setImageTab(v as "stencil" | "source")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stencil" className="gap-2">
                <Eye className="h-4 w-4" />
                {isGlitter ? "Glitter preview" : "Stencil preview"}
              </TabsTrigger>
              <TabsTrigger value="source" disabled={!manifest.sourceImageUrl} className="gap-2">
                <Paintbrush className="h-4 w-4" />
                Source photo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stencil">
              <div className="rounded-2xl overflow-hidden bg-[#463C37] flex items-center justify-center">
                {manifest.referenceImageUrl ? (
                  <img
                    src={manifest.referenceImageUrl}
                    alt={isGlitter ? "Glitter reveal preview" : "Stencil preview"}
                    className="w-full max-h-[600px] object-contain"
                  />
                ) : (
                  <div className="min-h-80 flex items-center justify-center text-sm text-white/60">
                    Preview unavailable
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground text-center">
                {isGlitter
                  ? "Les zones blanches forment la silhouette de votre portrait — le fond sera recouvert de paillettes."
                  : "Les zones blanches forment la silhouette de votre portrait — le fond sera peint par vous."}
              </p>
            </TabsContent>

            <TabsContent value="source">
              {manifest.sourceImageUrl ? (
                <div className="rounded-2xl overflow-hidden border">
                  <img
                    src={manifest.sourceImageUrl}
                    alt="Source photo"
                    className="w-full max-h-[600px] object-contain"
                  />
                </div>
              ) : (
                <div className="min-h-80 rounded-2xl border flex items-center justify-center text-sm text-muted-foreground bg-muted/40">
                  Source image unavailable on this device
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Kit info badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{manifest.canvasLabel}</Badge>
            {detailLabel && <Badge variant="outline">Detail: {detailLabel}</Badge>}
            {glitterPalette && <Badge variant="outline">Palette: {glitterPalette.name}</Badge>}
            <Badge variant="outline" className="font-mono">{manifest.instructionCode}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Glitter palette swatches */}
      {isGlitter && glitterPalette && (
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Palette {glitterPalette.name}</p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{glitterPalette.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {glitterPalette.colors.map((color) => (
                <div key={color.hex} className="text-center space-y-2">
                  <div
                    className="w-full aspect-square rounded-xl border"
                    style={{ backgroundColor: color.hex }}
                  />
                  <p className="text-xs font-medium">{color.name}</p>
                  <p className="text-xs text-muted-foreground">{color.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step-by-step instructions */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">
              {isGlitter ? "Comment réaliser votre Glitter Reveal" : "Comment réaliser votre Stencil Paint Reveal"}
            </p>
          </div>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {i + 1}
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
