import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/landing/Footer";
import { useTranslation } from "@/i18n";
import { useOrder, SIZE_LABELS, getPhoto } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generatePaintByNumbersPDF } from "@/lib/pdfGenerator";
import { processImage, type ProcessingResult } from "@/lib/imageProcessing";
import { GridViewer } from "@/components/GridViewer";
import {
  buildPaintingManifest,
  orderStyleToPaletteKey,
  persistPaintingManifestLocally,
  resolveManifestPalette,
  type PaintingManifest,
} from "@/lib/paintingManifest";
import { buildViewerUrl, BRAND } from "@/lib/brand";
import { supabase } from "@/integrations/supabase/client";
import {
  Download as DownloadIcon,
  FileText,
  Palette,
  Grid3X3,
  Home,
  Loader2,
  CheckCircle,
  ArrowLeft,
  Monitor,
  Image as ImageIcon,
  Share2,
  ExternalLink,
  Heart,
} from "lucide-react";

const Download = () => {
  const { t } = useTranslation();
  const { order } = useOrder();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [paintingManifest, setPaintingManifest] = useState<PaintingManifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dl = t.download;

  useEffect(() => {
    if (!getPhoto(order) || !order.selectedStyle || !order.selectedSize || !order.croppedArea) {
      navigate("/studio");
    }
  }, [order, navigate]);

  const kitSize = order.selectedSize === "stamp_kit_40x50" ? "40x50" : order.selectedSize === "stamp_kit_A4" ? "A4" : "30x40";
  const canvasLabel = order.selectedSize ? SIZE_LABELS[order.selectedSize] : "";
  const viewerPath = order.instructionCode ? buildViewerUrl(order.instructionCode, window.location.origin).replace(window.location.origin, "") : "";

  const sourceForProcessing = useMemo(() => order.aiGeneratedUrl || getPhoto(order), [order.aiGeneratedUrl, order.photos]);

  const processIfNeeded = async (): Promise<ProcessingResult> => {
    if (processingResult) return processingResult;

    const cropData = {
      x: Math.round(order.croppedArea!.x),
      y: Math.round(order.croppedArea!.y),
      width: Math.round(order.croppedArea!.width),
      height: Math.round(order.croppedArea!.height),
    };

    const results = await processImage(sourceForProcessing, cropData, kitSize as "40x50" | "30x40" | "A4");
    const selectedResult = results.find((result) => result.styleKey === orderStyleToPaletteKey(order.selectedStyle!)) || results[0];
    setProcessingResult(selectedResult);
    return selectedResult;
  };

  const ensureManifest = async (): Promise<PaintingManifest> => {
    if (paintingManifest) return paintingManifest;
    const result = await processIfNeeded();
    const manifest = buildPaintingManifest({
      order,
      result,
      origin: window.location.origin,
    });
    persistPaintingManifestLocally(manifest);
    setPaintingManifest(manifest);

    if (order.orderRef && order.instructionCode) {
      supabase.functions.invoke("upsert-painting-manifest", {
        body: {
          orderRef: order.orderRef,
          instructionCode: order.instructionCode,
          manifest,
        },
      }).then(({ error: manifestError }) => {
        if (manifestError) {
          console.warn("Failed to persist painting manifest remotely", manifestError);
        }
      });
    }

    return manifest;
  };

  const handleGenerate = async () => {
    if (!getPhoto(order) || !order.selectedStyle || !order.croppedArea) return;
    setGenerating(true);
    setProgress(0);
    setError(null);

    try {
      setProgressLabel(dl.progressSteps[0]);
      setProgress(20);
      const manifest = await ensureManifest();
      setProgressLabel(dl.progressSteps[1]);
      setProgress(55);
      const blob = await generatePaintByNumbersPDF(manifest);
      setProgressLabel(dl.progressSteps[2]);
      setProgress(100);
      setPdfBlob(blob);
    } catch (generationError) {
      console.error("PDF generation error:", generationError);
      setError(dl.error);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrepareViewer = async () => {
    setGenerating(true);
    setProgress(0);
    setError(null);

    try {
      setProgressLabel(dl.progressSteps[0]);
      setProgress(30);
      await ensureManifest();
      setProgressLabel(dl.progressSteps[1]);
      setProgress(100);
    } catch (viewerError) {
      console.error("Viewer preparation error:", viewerError);
      setError(dl.error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `helma-${order.orderRef || "portrait"}-instructions.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleSharePreview = async () => {
    const manifest = paintingManifest || (processingResult ? await ensureManifest() : null);
    if (!manifest) return;

    try {
      if (navigator.share) {
        const blob = await fetch(manifest.referenceImageUrl).then((response) => response.blob());
        const file = new File([blob], "helma-reference.jpg", { type: blob.type || "image/jpeg" });
        await navigator.share({ title: `${BRAND.name} reference`, files: [file] });
      } else {
        const link = document.createElement("a");
        link.href = manifest.referenceImageUrl;
        link.download = "helma-reference.jpg";
        link.click();
      }
    } catch {
      // User cancelled.
    }
  };

  const activeManifest = paintingManifest;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{dl.title}</h1>
              <p className="text-muted-foreground">{dl.subtitle}</p>
            </div>

            <Card className="mb-6 overflow-hidden">
              <CardContent className="p-0">
                <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
                  <div className="bg-primary/5 p-5">
                    {order.stylePreviewUrl ? (
                      <div className="overflow-hidden rounded-2xl border border-primary/10 bg-background">
                        <img src={order.stylePreviewUrl} alt="Preview" className="w-full object-cover" />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-primary/20 bg-background/70 h-full min-h-52 flex items-center justify-center text-sm text-muted-foreground">
                        Preview unavailable
                      </div>
                    )}
                  </div>
                  <div className="p-5 md:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{canvasLabel}</Badge>
                      <Badge variant="outline">{order.selectedStyle}</Badge>
                      {activeManifest && <Badge variant="outline">{activeManifest.stats.totalSections} sections</Badge>}
                      {activeManifest && <Badge variant="outline">{activeManifest.stats.colorCount} colors</Badge>}
                    </div>
                    <h2 className="mt-4 text-2xl font-bold">Painting Guide v2</h2>
                    <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                      Your PDF and live viewer now follow the same painting manifest, so the sections, colors, and instruction code stay aligned across both formats.
                    </p>
                    {order.dedicationText && (
                      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                        <div className="flex items-center gap-2 text-primary">
                          <Heart className="h-4 w-4" />
                          <span className="text-xs font-semibold uppercase tracking-[0.14em]">Dedication</span>
                        </div>
                        <p className="mt-2 text-sm font-medium">{order.dedicationText}</p>
                      </div>
                    )}
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border p-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.12em]">
                          <Grid3X3 className="h-3.5 w-3.5" /> Grid
                        </div>
                        <p className="mt-2 text-sm font-medium">{activeManifest ? `${activeManifest.gridCols} × ${activeManifest.gridRows}` : "Ready after processing"}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.12em]">
                          <Palette className="h-3.5 w-3.5" /> Difficulty
                        </div>
                        <p className="mt-2 text-sm font-medium">{activeManifest?.stats.difficultyLabel || "Based on kit size"}</p>
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.12em]">
                          <Monitor className="h-3.5 w-3.5" /> Live viewer
                        </div>
                        <p className="mt-2 text-sm font-medium font-mono">{order.instructionCode || "Pending code"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="pdf" className="mb-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pdf" className="gap-2">
                  <FileText className="h-4 w-4" />
                  {dl.tabPdf}
                </TabsTrigger>
                <TabsTrigger value="viewer" className="gap-2">
                  <Monitor className="h-4 w-4" />
                  {dl.tabViewer}
                </TabsTrigger>
                <TabsTrigger value="reference" className="gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Reference
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pdf">
                <Card>
                  <CardContent className="p-6 md:p-8 text-center">
                    {!pdfBlob && !generating && (
                      <div className="space-y-4">
                        <div className="mx-auto w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
                          <FileText className="h-10 w-10 text-primary/60" />
                        </div>
                        <h3 className="text-lg font-semibold">Manifest-based PDF ready</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          Generate the premium guide with dedication line, viewer QR, color legend, section pages, and the shared instruction code.
                        </p>
                        <Button size="lg" onClick={handleGenerate} className="rounded-full px-8 shimmer-btn">
                          <FileText className="mr-2 h-5 w-5" />
                          {dl.generateBtn}
                        </Button>
                      </div>
                    )}
                    {generating && (
                      <div className="space-y-4 py-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                        <p className="text-sm font-medium">{progressLabel}</p>
                        <Progress value={progress} className="max-w-xs mx-auto" />
                        <p className="text-xs text-muted-foreground">{progress}%</p>
                      </div>
                    )}
                    {pdfBlob && !generating && (
                      <div className="space-y-4 py-4">
                        <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                          <CheckCircle className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold">{dl.readyDownload}</h3>
                        <p className="text-sm text-muted-foreground">
                          {dl.pdfSize.replace("{size}", (pdfBlob.size / 1024 / 1024).toFixed(1))}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button size="lg" onClick={handleDownload} className="rounded-full px-8">
                            <DownloadIcon className="mr-2 h-5 w-5" />
                            {dl.downloadBtn}
                          </Button>
                          <Button variant="outline" onClick={() => { setPdfBlob(null); setProgress(0); }} className="rounded-full">
                            {dl.regenerateBtn}
                          </Button>
                        </div>
                      </div>
                    )}
                    {error && <p className="text-sm text-destructive mt-4">{error}</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="viewer">
                <Card>
                  <CardContent className="p-4 md:p-6 space-y-5">
                    {!activeManifest && !generating && (
                      <div className="text-center space-y-4 py-8">
                        <div className="mx-auto w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
                          <Monitor className="h-10 w-10 text-primary/60" />
                        </div>
                        <h3 className="text-lg font-semibold">Prepare the live viewer</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          Generate the shared manifest once, then use the viewer from this device or from the dedicated instruction-code page.
                        </p>
                        <Button size="lg" onClick={handlePrepareViewer} className="rounded-full px-8">
                          <Monitor className="mr-2 h-5 w-5" />
                          {dl.viewerBtn}
                        </Button>
                      </div>
                    )}
                    {generating && !activeManifest && (
                      <div className="text-center space-y-4 py-8">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                        <p className="text-sm font-medium">{progressLabel}</p>
                        <Progress value={progress} className="max-w-xs mx-auto" />
                      </div>
                    )}
                    {activeManifest && (
                      <>
                        <div className="rounded-2xl border bg-primary/5 p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Live Viewer</p>
                            <h3 className="mt-1 text-xl font-semibold">Open the same manifest online</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Use the dedicated viewer page for the cleanest experience or continue below with the embedded viewer.
                            </p>
                          </div>
                          {viewerPath && (
                            <Button asChild className="gap-2 rounded-full">
                              <Link to={viewerPath}>
                                Open full viewer
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        </div>
                        <GridViewer
                          indices={new Uint8Array(activeManifest.indices)}
                          gridCols={activeManifest.gridCols}
                          gridRows={activeManifest.gridRows}
                          palette={processingResult?.palette || resolveManifestPalette(activeManifest)}
                          previewDataUrl={activeManifest.previewDataUrl}
                          progressKey={activeManifest.instructionCode}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reference">
                <Card>
                  <CardContent className="p-4 md:p-6">
                    {!activeManifest && !generating ? (
                      <div className="text-center space-y-4 py-8">
                        <div className="mx-auto w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-primary/60" />
                        </div>
                        <h3 className="text-lg font-semibold">{dl.previewTitle}</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          Generate the shared manifest to unlock the polished reference preview used by both the PDF and the viewer.
                        </p>
                        <Button size="lg" onClick={handlePrepareViewer} className="rounded-full px-8">
                          <ImageIcon className="mr-2 h-5 w-5" />
                          {dl.previewBtn}
                        </Button>
                      </div>
                    ) : activeManifest ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-2xl border overflow-hidden">
                            <div className="border-b px-4 py-3 text-sm font-medium">Painting reference</div>
                            <img src={activeManifest.referenceImageUrl} alt="Reference" className="w-full h-full object-cover" />
                          </div>
                          <div className="rounded-2xl border overflow-hidden">
                            <div className="border-b px-4 py-3 text-sm font-medium">Source image</div>
                            {activeManifest.sourceImageUrl ? (
                              <img src={activeManifest.sourceImageUrl} alt="Source" className="w-full h-full object-cover" />
                            ) : (
                              <div className="min-h-80 flex items-center justify-center text-sm text-muted-foreground bg-muted/40">
                                Source image unavailable on this device
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-center gap-3">
                          <Button variant="outline" size="sm" onClick={handleSharePreview} className="gap-2">
                            <Share2 className="h-4 w-4" />
                            {dl.shareBtn}
                          </Button>
                          <Button variant="outline" size="sm" asChild className="gap-2">
                            <a href={activeManifest.referenceImageUrl} download="helma-reference.jpg">
                              <DownloadIcon className="h-4 w-4" />
                              Save reference
                            </a>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-4 py-8">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                        <p className="text-sm font-medium">{progressLabel}</p>
                        <Progress value={progress} className="max-w-xs mx-auto" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">{dl.includesTitle}</h3>
                <ul className="space-y-2">
                  {dl.includes.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/confirmation">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {dl.backToOrder}
                </Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-full">
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  {dl.backHome}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Download;
