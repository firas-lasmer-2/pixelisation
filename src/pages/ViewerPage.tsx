import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/landing/Footer";
import { GridViewer } from "@/components/GridViewer";
import { StencilViewer } from "@/components/StencilViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  loadPaintingManifestLocally,
  normalizePaintingManifest,
  persistPaintingManifestLocally,
  resolveManifestPalette,
  isStencilProduct,
  type PaintingManifest,
} from "@/lib/paintingManifest";
import { buildTrackUrl } from "@/lib/brand";
import { Home, AlertCircle, Loader2, ExternalLink, Layers, Palette, Clock4, Truck, Paintbrush, Sparkles, Info } from "lucide-react";
import { PRODUCT_TYPE_META, STENCIL_DETAIL_META } from "@/lib/store";
import type { GlitterPalette, StencilDetailLevel } from "@/lib/store";
import { GLITTER_PALETTES } from "@/lib/glitterPalettes";

const ViewerPage = () => {
  const { code } = useParams<{ code: string }>();
  const [manifest, setManifest] = useState<PaintingManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [referenceMode, setReferenceMode] = useState<"reference" | "source">("reference");

  useEffect(() => {
    if (!code) {
      setError(true);
      setLoading(false);
      return;
    }

    let active = true;
    const normalizedCode = code.toUpperCase();

    const loadManifest = async () => {
      const localManifest = loadPaintingManifestLocally(normalizedCode);
      if (localManifest && active) {
        setManifest(localManifest);
        setLoading(false);
        return;
      }

      const { data, error: functionError } = await supabase.functions.invoke("get-painting-manifest", {
        body: {
          instructionCode: normalizedCode,
        },
      });

      if (!active) return;

      if (functionError || data?.error || !data?.manifest) {
        setError(true);
        setLoading(false);
        return;
      }

      const remoteManifest = normalizePaintingManifest(data.manifest, normalizedCode);
      if (!remoteManifest) {
        setError(true);
        setLoading(false);
        return;
      }

      setManifest(remoteManifest);
      persistPaintingManifestLocally(remoteManifest);
      setLoading(false);
    };

    void loadManifest();

    return () => {
      active = false;
    };
  }, [code]);

  const palette = useMemo(() => (manifest ? resolveManifestPalette(manifest) : null), [manifest]);
  const activeReferenceUrl = referenceMode === "reference" || !manifest?.sourceImageUrl ? manifest?.referenceImageUrl : manifest.sourceImageUrl;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-12">
          {loading && (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading your painting workspace...</p>
            </div>
          )}

          {error && !loading && (
            <div className="max-w-md mx-auto text-center py-20">
              <Card>
                <CardContent className="p-8 space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <h2 className="text-xl font-bold">Viewer unavailable</h2>
                  <p className="text-sm text-muted-foreground">
                    This instruction code could not be found. Check the code on your PDF or confirmation email and try again.
                  </p>
                  <p className="text-xs font-mono text-muted-foreground bg-muted rounded px-3 py-2">
                    {code?.toUpperCase() || "—"}
                  </p>
                  <Button asChild className="rounded-full">
                    <Link to="/">
                      <Home className="mr-2 h-4 w-4" />
                      Back to home
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {!loading && !error && manifest && palette && (
            <div className="space-y-6">
              <Card className="overflow-hidden border-border">
                <CardContent className="p-0">
                  <div className="grid gap-0 lg:grid-cols-[360px_1fr]">
                    <div className={`p-5 ${isStencilProduct(manifest.productType) ? "bg-[#463C37]" : "bg-primary/5"}`}>
                      <div className="rounded-[28px] overflow-hidden border border-primary/10 bg-background shadow-sm">
                        <img src={manifest.referenceImageUrl} alt="Painting reference" className="w-full object-cover" />
                      </div>
                    </div>
                    <div className="p-5 md:p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{manifest.canvasLabel}</Badge>
                        {isStencilProduct(manifest.productType) ? (
                          <>
                            {manifest.stencilDetailLevel && (
                              <Badge variant="outline">
                                {manifest.productType === "glitter_reveal" ? "Palette" : "Detail"}: {
                                  manifest.productType === "glitter_reveal" && manifest.glitterPalette
                                    ? GLITTER_PALETTES[manifest.glitterPalette as GlitterPalette]?.name
                                    : STENCIL_DETAIL_META[manifest.stencilDetailLevel as StencilDetailLevel]?.label
                                }
                              </Badge>
                            )}
                          </>
                        ) : (
                          <>
                            <Badge variant="outline">{manifest.stats.colorCount} colors</Badge>
                            <Badge variant="outline">{manifest.stats.totalSections} sections</Badge>
                          </>
                        )}
                      </div>
                      <h1 className="mt-4 text-2xl md:text-3xl font-bold">
                        {manifest.productType && manifest.productType !== "paint_by_numbers"
                          ? `Helma — ${PRODUCT_TYPE_META[manifest.productType].label}`
                          : "Helma Painting Workspace"}
                      </h1>
                      <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                        {manifest.productType === "stencil_paint"
                          ? "Voici l'aperçu de votre pochoir personnalisé. Le résultat final apparaîtra après avoir peint et décollé le pochoir."
                          : manifest.productType === "glitter_reveal"
                          ? "Voici l'aperçu de votre pochoir pour paillettes. Parsemez de paillettes, décollez et découvrez votre portrait scintillant !"
                          : "This viewer follows the exact same painting manifest as your PDF guide, so the color letters, section numbering, and progress all stay aligned."}
                      </p>

                      {isStencilProduct(manifest.productType) ? (
                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          <div className="rounded-xl border p-3">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                              {manifest.productType === "glitter_reveal" ? <Sparkles className="h-3.5 w-3.5" /> : <Paintbrush className="h-3.5 w-3.5" />}
                              {manifest.productType === "glitter_reveal" ? "Palette" : "Detail"}
                            </div>
                            <p className="mt-2 text-lg font-semibold">
                              {manifest.productType === "glitter_reveal" && manifest.glitterPalette
                                ? GLITTER_PALETTES[manifest.glitterPalette as GlitterPalette]?.name || "—"
                                : manifest.stencilDetailLevel
                                  ? STENCIL_DETAIL_META[manifest.stencilDetailLevel as StencilDetailLevel]?.label || "—"
                                  : "—"}
                            </p>
                          </div>
                          <div className="rounded-xl border p-3">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                              <Info className="h-3.5 w-3.5" /> Product
                            </div>
                            <p className="mt-2 text-lg font-semibold">{PRODUCT_TYPE_META[manifest.productType].label}</p>
                          </div>
                          <div className="rounded-xl border p-3">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                              <Truck className="h-3.5 w-3.5" /> Code
                            </div>
                            <p className="mt-2 text-lg font-semibold font-mono">{manifest.instructionCode}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5 grid gap-3 md:grid-cols-4">
                          <div className="rounded-xl border p-3">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                              <Layers className="h-3.5 w-3.5" /> Sections
                            </div>
                            <p className="mt-2 text-lg font-semibold">{manifest.stats.totalSections}</p>
                          </div>
                          <div className="rounded-xl border p-3">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                              <Palette className="h-3.5 w-3.5" /> Difficulty
                            </div>
                            <p className="mt-2 text-lg font-semibold">{manifest.stats.difficultyLabel}</p>
                          </div>
                          <div className="rounded-xl border p-3">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                              <Clock4 className="h-3.5 w-3.5" /> Time
                            </div>
                            <p className="mt-2 text-lg font-semibold">{manifest.stats.estimatedHours}</p>
                          </div>
                          <div className="rounded-xl border p-3">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                              <Truck className="h-3.5 w-3.5" /> Code
                            </div>
                            <p className="mt-2 text-lg font-semibold font-mono">{manifest.instructionCode}</p>
                          </div>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-3">
                        {manifest.orderRef && (
                          <Button asChild variant="outline" className="rounded-full gap-2">
                            <Link to={buildTrackUrl(manifest.orderRef, manifest.instructionCode, window.location.origin).replace(window.location.origin, "")}>
                              Track order
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        <Badge variant="outline" className="rounded-full px-3 py-1 font-mono">
                          {manifest.orderRef || manifest.instructionCode}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isStencilProduct(manifest.productType) ? (
                <StencilViewer manifest={manifest} />
              ) : (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-6">
                    <GridViewer
                      indices={new Uint8Array(manifest.indices)}
                      gridCols={manifest.gridCols}
                      gridRows={manifest.gridRows}
                      palette={palette}
                      previewDataUrl={manifest.previewDataUrl}
                      progressKey={manifest.instructionCode}
                    />
                  </div>

                  <div className="space-y-4">
                    <Card className="border-border">
                      <CardContent className="p-5">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Reference Board</p>
                        <Tabs value={referenceMode} onValueChange={(value) => setReferenceMode(value as "reference" | "source")} className="mt-4">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="reference">Paint reference</TabsTrigger>
                            <TabsTrigger value="source" disabled={!manifest.sourceImageUrl}>
                              Source image
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                        <div className="mt-4 overflow-hidden rounded-2xl border bg-muted/30">
                          {activeReferenceUrl ? (
                            <img src={activeReferenceUrl} alt="Reference board" className="w-full object-cover" />
                          ) : (
                            <div className="min-h-80 flex items-center justify-center text-sm text-muted-foreground">
                              Source image unavailable
                            </div>
                          )}
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                          Keep the reference open while you paint. Use the section viewer on the left for precision and this panel for composition context.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-border">
                      <CardContent className="p-5">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Painting Tips</p>
                        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                          <p>Start with lighter colors, then move to darker tones to keep the canvas clean.</p>
                          <p>Use one section at a time and mark it complete in the viewer when you finish it.</p>
                          <p>Switch between the reference and source image when you want help with details and overall composition.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ViewerPage;
