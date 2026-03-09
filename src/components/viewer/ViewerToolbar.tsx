import { Button } from "@/components/ui/button";
import {
  ZoomIn, ZoomOut, Eye, EyeOff, Printer, Maximize, Minimize, Paintbrush,
} from "lucide-react";

interface ViewerToolbarProps {
  zoom: number;
  colorMode: boolean;
  paintMode: boolean;
  isFullscreen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onColorMode: (v: boolean) => void;
  onPaintMode: (v: boolean) => void;
  onPrint: () => void;
  onFullscreen: () => void;
  colorLabel: string;
  cleanLabel: string;
  paintLabel: string;
}

export function ViewerToolbar({
  zoom, colorMode, paintMode, isFullscreen,
  onZoomIn, onZoomOut, onColorMode, onPaintMode, onPrint, onFullscreen,
  colorLabel, cleanLabel, paintLabel,
}: ViewerToolbarProps) {
  return (
    <div className="viewer-floating-toolbar">
      <div className="flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-full px-2 py-1 shadow-lg">
        <Button
          variant={!paintMode && colorMode ? "default" : "ghost"}
          size="icon"
          onClick={() => { onPaintMode(false); onColorMode(true); }}
          className="h-7 w-7 rounded-full"
          title={colorLabel}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={!paintMode && !colorMode ? "default" : "ghost"}
          size="icon"
          onClick={() => { onPaintMode(false); onColorMode(false); }}
          className="h-7 w-7 rounded-full"
          title={cleanLabel}
        >
          <EyeOff className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={paintMode ? "default" : "ghost"}
          size="icon"
          onClick={() => onPaintMode(!paintMode)}
          className="h-7 w-7 rounded-full"
          title={paintLabel}
        >
          <Paintbrush className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Button variant="ghost" size="icon" onClick={onZoomOut} disabled={zoom <= 0.5} className="h-7 w-7 rounded-full">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[10px] text-muted-foreground w-8 text-center font-medium">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" onClick={onZoomIn} disabled={zoom >= 3} className="h-7 w-7 rounded-full">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Button variant="ghost" size="icon" onClick={onPrint} className="h-7 w-7 rounded-full">
          <Printer className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onFullscreen} className="h-7 w-7 rounded-full">
          {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
