import { useState, useEffect } from "react";
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
import { generatePaintByNumbersPDF, getSectionStats } from "@/lib/pdfGenerator";
import { processImage, ProcessingResult, GRID_CONFIG } from "@/lib/imageProcessing";
import { GridViewer } from "@/components/GridViewer";
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
  const [error, setError] = useState<string | null>(null);

  const dl = t.download;

  useEffect(() => {
    if (!getPhoto(order) || !order.selectedStyle || !order.selectedSize) {
      navigate("/studio");
    }
  }, [order, navigate]);

  const kitSize = order.selectedSize === "stamp_kit_40x50" ? "40x50" : order.selectedSize === "stamp_kit_A4" ? "A4" : "30x40";
  const canvasLabel = order.selectedSize ? SIZE_LABELS[order.selectedSize] : "";
  const gridConfig = GRID_CONFIG[kitSize as "40x50" | "30x40" | "A4"];
  const stats = getSectionStats(gridConfig.cols, gridConfig.rows);

  const VIEWER_STORAGE_PREFIX = "flink-viewer-data-";

  const processIfNeeded = async (): Promise<ProcessingResult> => {
    if (processingResult) return processingResult;
    const cropData = {
      x: Math.round(order.croppedArea!.x),
      y: Math.round(order.croppedArea!.y),
      width: Math.round(order.croppedArea!.width),
      height: Math.round(order.croppedArea!.height),
    };
    const results = await processImage(getPhoto(order), cropData, kitSize as "40x50" | "30x40" | "A4");
    const result = results.find(r => r.styleKey === order.selectedStyle) || results[0];
    setProcessingResult(result);

    // Persist to localStorage for QR-based viewer access
    if (order.instructionCode) {
      try {
        const viewerData = {
          indices: Array.from(result.indices),
          gridCols: result.gridCols,
          gridRows: result.gridRows,
          paletteKey: result.styleKey,
          previewDataUrl: result.dataUrl,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        localStorage.setItem(
          VIEWER_STORAGE_PREFIX + order.instructionCode,
          JSON.stringify(viewerData)
        );
      } catch (e) {
        console.warn("Could not persist viewer data:", e);
      }
    }

    return result;
  };

  const handleGenerate = async () => {
    if (!getPhoto(order) || !order.selectedStyle || !order.croppedArea) return;
    setGenerating(true);
    setProgress(0);
    setError(null);
    try {
      setProgressLabel(dl.progressSteps[0]);
      setProgress(10);
      const result = await processIfNeeded();
      setProgress(50);
      setProgressLabel(dl.progressSteps[1]);
      await new Promise(r => setTimeout(r, 200));
      setProgress(70);
      setProgressLabel(dl.progressSteps[2]);
      const blob = await generatePaintByNumbersPDF({
        indices: result.indices,
        gridCols: result.gridCols,
        gridRows: result.gridRows,
        palette: result.palette,
        previewDataUrl: result.dataUrl,
        canvasSize: kitSize === "40x50" ? "40×50" : kitSize === "A4" ? "A4 (21×30)" : "30×40",
        brandName: "FLINK ATELIER",
        instructionCode: order.instructionCode || undefined,
      });
      setProgress(100);
      setProgressLabel(dl.progressSteps[3]);
      setPdfBlob(blob);
    } catch (e) {
      console.error("PDF generation error:", e);
      setError(dl.error);
    } finally {
      setGenerating(false);
    }
  };

  const handleViewOnline = async () => {
    if (!getPhoto(order) || !order.selectedStyle || !order.croppedArea) return;
    if (processingResult) return;
    setGenerating(true);
    setProgress(0);
    setError(null);
    try {
      setProgressLabel(dl.progressSteps[0]);
      setProgress(30);
      await processIfNeeded();
      setProgress(100);
    } catch (e) {
      console.error("Processing error:", e);
      setError(dl.error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flink-atelier-${order.orderRef || "portrait"}-instructions.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSharePreview = async () => {
    if (!processingResult) return;
    try {
      if (navigator.share) {
        const blob = await fetch(processingResult.dataUrl).then(r => r.blob());
        const file = new File([blob], "flink-atelier-preview.png", { type: "image/png" });
        await navigator.share({ title: "My Paint by Numbers", files: [file] });
      } else {
        const link = document.createElement("a");
        link.href = processingResult.dataUrl;
        link.download = "flink-atelier-preview.png";
        link.click();
      }
    } catch (e) { /* user cancelled */ }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-16">
          <div className="mx-auto max-w-3xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{dl.title}</h1>
              <p className="text-muted-foreground">{dl.subtitle}</p>
            </div>

            {/* Order Summary */}
            <Card className="mb-6">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {order.stylePreviewUrl && (
                    <div className="w-full sm:w-32 h-40 sm:h-32 rounded-lg overflow-hidden border border-border flex-shrink-0">
                      <img src={order.stylePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{dl.style}:</span>
                      <Badge variant="secondary">{order.selectedStyle}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{dl.size}:</span>
                      <Badge variant="secondary">{canvasLabel}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <p>{dl.gridInfo.replace("{cols}", String(gridConfig.cols)).replace("{rows}", String(gridConfig.rows))}</p>
                      <p>{dl.sectionInfo.replace("{sections}", String(stats.totalSections)).replace("{pages}", String(stats.totalPages))}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
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
                <TabsTrigger value="preview" className="gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {dl.tabPreview}
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
                        <h3 className="text-lg font-semibold">{dl.readyTitle}</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">{dl.readyDescription}</p>
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
                  <CardContent className="p-4 md:p-6">
                    {!processingResult && !generating && (
                      <div className="text-center space-y-4 py-8">
                        <div className="mx-auto w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
                          <Monitor className="h-10 w-10 text-primary/60" />
                        </div>
                        <h3 className="text-lg font-semibold">{dl.viewerReady}</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">{dl.viewerDescription}</p>
                        <Button size="lg" onClick={handleViewOnline} className="rounded-full px-8">
                          <Monitor className="mr-2 h-5 w-5" />
                          {dl.viewerBtn}
                        </Button>
                      </div>
                    )}
                    {generating && !processingResult && (
                      <div className="text-center space-y-4 py-8">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                        <p className="text-sm font-medium">{progressLabel}</p>
                        <Progress value={progress} className="max-w-xs mx-auto" />
                      </div>
                    )}
                    {processingResult && (
                      <GridViewer
                        indices={processingResult.indices}
                        gridCols={processingResult.gridCols}
                        gridRows={processingResult.gridRows}
                        palette={processingResult.palette}
                        previewDataUrl={processingResult.dataUrl}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preview">
                <Card>
                  <CardContent className="p-4 md:p-6">
                    {!processingResult && !generating && (
                      <div className="text-center space-y-4 py-8">
                        <div className="mx-auto w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-primary/60" />
                        </div>
                        <h3 className="text-lg font-semibold">{dl.previewTitle}</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">{dl.previewDescription}</p>
                        <Button size="lg" onClick={handleViewOnline} className="rounded-full px-8">
                          <ImageIcon className="mr-2 h-5 w-5" />
                          {dl.previewBtn}
                        </Button>
                      </div>
                    )}
                    {generating && !processingResult && (
                      <div className="text-center space-y-4 py-8">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                        <p className="text-sm font-medium">{progressLabel}</p>
                        <Progress value={progress} className="max-w-xs mx-auto" />
                      </div>
                    )}
                    {processingResult && (
                      <div className="space-y-4">
                        <div className="rounded-lg overflow-hidden border border-border">
                          <img src={processingResult.dataUrl} alt="Full preview" className="w-full h-auto" style={{ imageRendering: 'pixelated' }} />
                        </div>
                        <div className="flex justify-center gap-3">
                          <Button variant="outline" size="sm" onClick={handleSharePreview} className="gap-2">
                            <Share2 className="h-4 w-4" />
                            {dl.shareBtn}
                          </Button>
                          <Button variant="outline" size="sm" asChild className="gap-2">
                            <a href={processingResult.dataUrl} download="flink-preview.png">
                              <DownloadIcon className="h-4 w-4" />
                              {dl.saveImageBtn}
                            </a>
                          </Button>
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          {dl.previewDimensions
                            .replace("{cols}", String(processingResult.gridCols))
                            .replace("{rows}", String(processingResult.gridRows))
                            .replace("{size}", kitSize === "40x50" ? "40×50 cm" : kitSize === "A4" ? "A4 (21×30 cm)" : "30×40 cm")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* What's included */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">{dl.includesTitle}</h3>
                <ul className="space-y-2">
                  {dl.includes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Navigation */}
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
