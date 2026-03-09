import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/landing/Footer";
import { GridViewer } from "@/components/GridViewer";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PALETTES, StylePalette, STYLE_KEYS } from "@/lib/palettes";
import { renderPixelGrid } from "@/lib/imageProcessing";
import { Home, AlertCircle, Loader2 } from "lucide-react";

const VIEWER_STORAGE_PREFIX = "flink-viewer-data-";

interface ViewerData {
  indices: number[];
  gridCols: number;
  gridRows: number;
  paletteKey: string;
  previewDataUrl: string;
  createdAt: string;
}

const ViewerPage = () => {
  const { code } = useParams<{ code: string }>();
  const { t } = useTranslation();
  const vt = (t as any).viewerPage || {};

  const [viewerData, setViewerData] = useState<ViewerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(VIEWER_STORAGE_PREFIX + code.toUpperCase());
      if (stored) {
        const parsed = JSON.parse(stored) as ViewerData;
        setViewerData(parsed);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [code]);

  const indices = viewerData ? new Uint8Array(viewerData.indices) : null;
  const palette: StylePalette | null = viewerData
    ? PALETTES[viewerData.paletteKey as keyof typeof PALETTES] || PALETTES[STYLE_KEYS[0]]
    : null;

  // Generate preview if not stored
  const previewDataUrl = viewerData?.previewDataUrl || (() => {
    if (!indices || !palette || !viewerData) return "";
    const canvas = renderPixelGrid(indices, palette.colors, viewerData.gridCols, viewerData.gridRows, 6);
    return canvas.toDataURL("image/png");
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">{vt.loading || "Chargement..."}</p>
            </div>
          )}

          {error && !loading && (
            <div className="max-w-md mx-auto text-center py-20">
              <Card>
                <CardContent className="p-8 space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <h2 className="text-xl font-bold">{vt.notFound || "Code introuvable"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {vt.notFoundDesc || "Ce code d'instruction n'existe pas ou a expiré. Vérifiez le code et réessayez."}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground bg-muted rounded px-3 py-2">
                    {code?.toUpperCase() || "—"}
                  </p>
                  <Button asChild className="rounded-full">
                    <Link to="/">
                      <Home className="mr-2 h-4 w-4" />
                      {vt.backHome || "Retour à l'accueil"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {!loading && !error && viewerData && indices && palette && (
            <div>
              <div className="text-center mb-6">
                <h1 className="text-xl md:text-2xl font-bold mb-1">
                  {vt.title || "Vos instructions de peinture"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {vt.subtitle || "Suivez les sections pour compléter votre œuvre d'art"}
                </p>
                <p className="text-xs font-mono text-muted-foreground mt-1">
                  Code: {code?.toUpperCase()}
                </p>
              </div>
              <GridViewer
                indices={indices}
                gridCols={viewerData.gridCols}
                gridRows={viewerData.gridRows}
                palette={palette}
                previewDataUrl={previewDataUrl}
              />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ViewerPage;
