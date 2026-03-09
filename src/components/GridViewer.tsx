import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { PaletteColor, StylePalette } from "@/lib/palettes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/i18n";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Palette,
  Map,
} from "lucide-react";

import { ProgressRing } from "@/components/viewer/ProgressRing";
import { PalettePanel } from "@/components/viewer/PalettePanel";
import { SectionMinimap } from "@/components/viewer/SectionMinimap";
import { ViewerToolbar } from "@/components/viewer/ViewerToolbar";
import { ColorTooltip } from "@/components/viewer/ColorTooltip";
import { renderSmoothPreview } from "@/lib/imageProcessing";
import { COLOR_LETTERS } from "@/lib/palettes";
import { STORAGE_KEYS } from "@/lib/brand";

const SECTION_COLS = 9;
const SECTION_ROWS = 13;
const STORAGE_KEY = STORAGE_KEYS.viewerCompleted;

interface GridViewerProps {
  indices: Uint8Array;
  gridCols: number;
  gridRows: number;
  palette: StylePalette;
  previewDataUrl: string;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function GridViewer({ indices, gridCols, gridRows, palette, previewDataUrl }: GridViewerProps) {
  const { t } = useTranslation();
  const sectionCols = Math.ceil(gridCols / SECTION_COLS);
  const sectionRows = Math.ceil(gridRows / SECTION_ROWS);
  const totalSections = sectionCols * sectionRows;

  const [activeSection, setActiveSection] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [colorMode, setColorMode] = useState(true);
  const [paintMode, setPaintMode] = useState(false);
  const [completedSections, setCompletedSections] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const arr = JSON.parse(saved);
        return new Set(arr);
      }
    } catch {}
    return new Set();
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightColor, setHighlightColor] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [minimapOpen, setMinimapOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; colorIdx: number; key: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  // Smooth overview image (generated once)
  const smoothOverviewRef = useRef<string | null>(null);

  // Drag-to-pan state
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });
  // Swipe state
  const swipeRef = useRef({ startX: 0, startY: 0 });

  const vt = (t as any).viewer || {};

  // Generate smooth overview once on mount
  useEffect(() => {
    try {
      const smoothCanvas = renderSmoothPreview(indices, palette.colors, gridCols, gridRows, 6);
      smoothOverviewRef.current = smoothCanvas.toDataURL("image/png");
    } catch {
      smoothOverviewRef.current = previewDataUrl;
    }
  }, [indices, palette.colors, gridCols, gridRows, previewDataUrl]);

  // Persist completed sections
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedSections]));
    } catch {}
  }, [completedSections]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setActiveSection(s => Math.max(0, s - 1));
      else if (e.key === "ArrowRight") setActiveSection(s => Math.min(totalSections - 1, s + 1));
      else if (e.key === "ArrowUp") setActiveSection(s => Math.max(0, s - sectionCols));
      else if (e.key === "ArrowDown") setActiveSection(s => Math.min(totalSections - 1, s + sectionCols));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [totalSections, sectionCols]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Section color stats
  const sectionColorStats = useMemo(() => {
    const sCol = activeSection % sectionCols;
    const sRow = Math.floor(activeSection / sectionCols);
    const startCol = sCol * SECTION_COLS;
    const startRow = sRow * SECTION_ROWS;
    const counts = new Array(palette.colors.length).fill(0);
    for (let r = startRow; r < Math.min(startRow + SECTION_ROWS, gridRows); r++) {
      for (let c = startCol; c < Math.min(startCol + SECTION_COLS, gridCols); c++) {
        counts[indices[r * gridCols + c]]++;
      }
    }
    return counts;
  }, [activeSection, indices, gridCols, gridRows, palette.colors.length, sectionCols]);

  // Draw overlay (smooth preview with section grid)
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const container = overlayContainerRef.current;
    if (!canvas || !container) return;

    const imgSrc = smoothOverviewRef.current || previewDataUrl;
    const img = new Image();
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      const maxW = container.clientWidth;
      const scale = maxW / img.width;
      const logicalW = maxW;
      const logicalH = img.height * scale;

      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
      canvas.style.width = `${logicalW}px`;
      canvas.style.height = `${logicalH}px`;

      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0, logicalW, logicalH);

      const cellW = logicalW / sectionCols;
      const cellH = logicalH / sectionRows;

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 0.3;
      for (let r = 0; r <= sectionRows; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * cellH); ctx.lineTo(logicalW, r * cellH); ctx.stroke();
      }
      for (let c = 0; c <= sectionCols; c++) {
        ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, logicalH); ctx.stroke();
      }

      // Completed sections overlay
      for (let sr = 0; sr < sectionRows; sr++) {
        for (let sc = 0; sc < sectionCols; sc++) {
          const idx = sr * sectionCols + sc;
          if (completedSections.has(idx)) {
            ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
            ctx.fillRect(sc * cellW, sr * cellH, cellW, cellH);
          }
        }
      }

      // Active section highlight (bold, with number)
      const activeSC = activeSection % sectionCols;
      const activeSR = Math.floor(activeSection / sectionCols);
      ctx.fillStyle = "rgba(59, 130, 246, 0.35)";
      ctx.fillRect(activeSC * cellW, activeSR * cellH, cellW, cellH);
      ctx.strokeStyle = "rgba(59, 130, 246, 1)";
      ctx.lineWidth = 2;
      ctx.strokeRect(activeSC * cellW + 1, activeSR * cellH + 1, cellW - 2, cellH - 2);

      // Only show number on active section
      const fontSize = Math.max(7, Math.min(cellW * 0.6, cellH * 0.5));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const acx = activeSC * cellW + cellW / 2;
      const acy = activeSR * cellH + cellH / 2;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText(String(activeSection + 1), acx + 0.5, acy + 0.5);
      ctx.fillStyle = "#fff";
      ctx.fillText(String(activeSection + 1), acx, acy);
    };
    img.src = imgSrc;
  }, [previewDataUrl, sectionCols, sectionRows, activeSection, completedSections]);

  // Draw section grid or paint mode
  const drawSection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const sCol = activeSection % sectionCols;
    const sRow = Math.floor(activeSection / sectionCols);
    const startCol = sCol * SECTION_COLS;
    const startRow = sRow * SECTION_ROWS;
    const cols = Math.min(SECTION_COLS, gridCols - startCol);
    const rows = Math.min(SECTION_ROWS, gridRows - startRow);

    const cellSize = Math.floor(32 * zoom);
    const labelSpace = 24;

    const logicalW = cols * cellSize + labelSpace * 2;
    const logicalH = rows * cellSize + labelSpace * 2;

    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    canvas.style.width = `${logicalW}px`;
    canvas.style.height = `${logicalH}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, logicalW, logicalH);

    // Labels
    ctx.font = `${Math.max(9, 11 * zoom)}px sans-serif`;
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    for (let c = 0; c < cols; c++) {
      ctx.fillText(String(c + 1), labelSpace + c * cellSize + cellSize / 2, labelSpace - 6);
      ctx.fillText(String(c + 1), labelSpace + c * cellSize + cellSize / 2, labelSpace + rows * cellSize + 14);
    }
    ctx.textAlign = "right";
    for (let r = 0; r < rows; r++) {
      const ry = labelSpace + r * cellSize + cellSize / 2 + 4;
      ctx.textAlign = "right";
      ctx.fillText(String(r + 1), labelSpace - 6, ry);
      ctx.textAlign = "left";
      ctx.fillText(String(r + 1), labelSpace + cols * cellSize + 6, ry);
    }

    if (paintMode) {
      // PAINT MODE: bilinear interpolation for this section
      for (let r = 0; r < rows; r++) {
        const globalRow = startRow + r;
        if (globalRow >= gridRows) break;
        for (let c = 0; c < cols; c++) {
          const globalCol = startCol + c;
          if (globalCol >= gridCols) break;

          const x = labelSpace + c * cellSize;
          const y = labelSpace + r * cellSize;

          // Render each cell with smooth blending from neighbors
          for (let py = 0; py < cellSize; py++) {
            for (let px = 0; px < cellSize; px++) {
              // Fractional position within this cell (0..1)
              const fx = px / cellSize;
              const fy = py / cellSize;

              // Get colors from neighboring cells for blending
              const gc = globalCol;
              const gr = globalRow;

              // Determine which neighbors to blend with based on position
              const nc = fx < 0.5 ? Math.max(0, gc - 1) : Math.min(gridCols - 1, gc + 1);
              const nr = fy < 0.5 ? Math.max(0, gr - 1) : Math.min(gridRows - 1, gr + 1);

              const c00 = palette.colors[indices[gr * gridCols + gc]];
              const c10 = palette.colors[indices[gr * gridCols + nc]];
              const c01 = palette.colors[indices[nr * gridCols + gc]];
              const c11 = palette.colors[indices[nr * gridCols + nc]];

              // Weight: strong center, gentle blend at edges
              const bx = fx < 0.5 ? 0.5 - fx : fx - 0.5;
              const by = fy < 0.5 ? 0.5 - fy : fy - 0.5;
              const blend = bx * by * 0.6; // subtle blending factor

              const rr = Math.round(c00.r * (1 - blend) + (c10.r * bx + c01.r * by + c11.r * blend * 0.3) * blend / (bx + by + blend * 0.3 + 0.001) * blend + c00.r * (1 - blend) * 0);

              // Simplified: just do full bilinear
              const wx = fx < 0.5 ? (0.5 - fx) * 0.4 : (fx - 0.5) * 0.4;
              const wy = fy < 0.5 ? (0.5 - fy) * 0.4 : (fy - 0.5) * 0.4;
              const wc = 1 - wx - wy + wx * wy;

              const finalR = Math.round(c00.r * wc + c10.r * wx * (1 - wy) + c01.r * wy * (1 - wx) + c11.r * wx * wy);
              const finalG = Math.round(c00.g * wc + c10.g * wx * (1 - wy) + c01.g * wy * (1 - wx) + c11.g * wx * wy);
              const finalB = Math.round(c00.b * wc + c10.b * wx * (1 - wy) + c01.b * wy * (1 - wx) + c11.b * wx * wy);

              ctx.fillStyle = `rgb(${finalR},${finalG},${finalB})`;
              ctx.fillRect(x + px, y + py, 1, 1);
            }
          }
        }
      }

      // Light grid overlay in paint mode
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(labelSpace, labelSpace + r * cellSize);
        ctx.lineTo(labelSpace + cols * cellSize, labelSpace + r * cellSize);
        ctx.stroke();
      }
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(labelSpace + c * cellSize, labelSpace);
        ctx.lineTo(labelSpace + c * cellSize, labelSpace + rows * cellSize);
        ctx.stroke();
      }
    } else {
      // GRID MODE: enhanced with gradients and inner shadows
      for (let r = 0; r < rows; r++) {
        const globalRow = startRow + r;
        if (globalRow >= gridRows) break;
        for (let c = 0; c < cols; c++) {
          const globalCol = startCol + c;
          if (globalCol >= gridCols) break;

          const colorIdx = indices[globalRow * gridCols + globalCol];
          const color = palette.colors[colorIdx];
          const [cr, cg, cb] = hexToRgb(color.hex);

          const x = labelSpace + c * cellSize;
          const y = labelSpace + r * cellSize;

          if (colorMode) {
            const tR = Math.round(cr + (255 - cr) * 0.40);
            const tG = Math.round(cg + (255 - cg) * 0.40);
            const tB = Math.round(cb + (255 - cb) * 0.40);

            // Gradient fill for depth
            const grad = ctx.createRadialGradient(
              x + cellSize / 2, y + cellSize / 2, 0,
              x + cellSize / 2, y + cellSize / 2, cellSize * 0.7
            );
            grad.addColorStop(0, `rgb(${Math.min(255, tR + 8)},${Math.min(255, tG + 8)},${Math.min(255, tB + 8)})`);
            grad.addColorStop(1, `rgb(${Math.max(0, tR - 12)},${Math.max(0, tG - 12)},${Math.max(0, tB - 12)})`);
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, cellSize, cellSize);

            // Subtle inner shadow (top-left highlight, bottom-right shadow)
            if (cellSize >= 20) {
              ctx.fillStyle = `rgba(255,255,255,0.12)`;
              ctx.fillRect(x, y, cellSize, 1);
              ctx.fillRect(x, y, 1, cellSize);
              ctx.fillStyle = `rgba(0,0,0,0.06)`;
              ctx.fillRect(x, y + cellSize - 1, cellSize, 1);
              ctx.fillRect(x + cellSize - 1, y, 1, cellSize);
            }

            if (highlightColor !== null && colorIdx === highlightColor) {
              ctx.fillStyle = `rgba(${cr},${cg},${cb},0.7)`;
              ctx.fillRect(x, y, cellSize, cellSize);
              ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
              ctx.lineWidth = 2;
              ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
            } else if (highlightColor !== null && colorIdx !== highlightColor) {
              ctx.fillStyle = "rgba(255,255,255,0.6)";
              ctx.fillRect(x, y, cellSize, cellSize);
            }
          } else {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(x, y, cellSize, cellSize);
            if (highlightColor !== null && colorIdx === highlightColor) {
              ctx.fillStyle = `rgba(${cr},${cg},${cb},0.2)`;
              ctx.fillRect(x, y, cellSize, cellSize);
            }
          }

          ctx.strokeStyle = colorMode ? "#bbb" : "#ddd";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellSize, cellSize);

          const lum = colorMode
            ? 0.299 * Math.round(cr + (255 - cr) * 0.40) + 0.587 * Math.round(cg + (255 - cg) * 0.40) + 0.114 * Math.round(cb + (255 - cb) * 0.40)
            : 255;
          ctx.fillStyle = lum > 170 ? "#333" : "#111";
          ctx.font = `bold ${Math.max(11, 14 * zoom)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(
            COLOR_LETTERS[colorIdx] || String(colorIdx),
            x + cellSize / 2,
            y + cellSize / 2 + 5 * zoom
          );
        }
      }
    }

    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(labelSpace, labelSpace, cols * cellSize, rows * cellSize);
  }, [activeSection, zoom, indices, gridCols, gridRows, palette, sectionCols, colorMode, highlightColor, paintMode]);

  useEffect(() => {
    drawSection();
    drawOverlay();
  }, [drawSection, drawOverlay]);

  // Drag-to-pan on canvas container
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;

    const onMouseDown = (e: MouseEvent) => {
      dragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, scrollLeft: wrap.scrollLeft, scrollTop: wrap.scrollTop };
      wrap.style.cursor = "grabbing";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return;
      wrap.scrollLeft = dragRef.current.scrollLeft - (e.clientX - dragRef.current.startX);
      wrap.scrollTop = dragRef.current.scrollTop - (e.clientY - dragRef.current.startY);
    };
    const onMouseUp = () => {
      dragRef.current.isDragging = false;
      wrap.style.cursor = "grab";
    };

    wrap.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      wrap.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Pinch-to-zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let lastDist = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastDist = Math.sqrt(dx * dx + dy * dy);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastDist > 0) {
          const s = dist / lastDist;
          setZoom(z => Math.min(3, Math.max(0.5, z * s)));
        }
        lastDist = dist;
      }
    };
    const onTouchEnd = () => { lastDist = 0; };
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Swipe to navigate sections (mobile)
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        swipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - swipeRef.current.startX;
        const dy = e.changedTouches[0].clientY - swipeRef.current.startY;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (dx < 0) setActiveSection(s => Math.min(totalSections - 1, s + 1));
          else setActiveSection(s => Math.max(0, s - 1));
        }
      }
    };
    wrap.addEventListener("touchstart", onStart, { passive: true });
    wrap.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      wrap.removeEventListener("touchstart", onStart);
      wrap.removeEventListener("touchend", onEnd);
    };
  }, [totalSections]);

  // Tap to identify color
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || dragRef.current.isDragging) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
    const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const cellSize = Math.floor(32 * zoom);
    const labelSpace = 24;
    const col = Math.floor((mx - labelSpace) / cellSize);
    const row = Math.floor((my - labelSpace) / cellSize);

    const sCol = activeSection % sectionCols;
    const sRow = Math.floor(activeSection / sectionCols);
    const startCol = sCol * SECTION_COLS;
    const startRow = sRow * SECTION_ROWS;
    const cols = Math.min(SECTION_COLS, gridCols - startCol);
    const rows = Math.min(SECTION_ROWS, gridRows - startRow);

    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const globalRow = startRow + row;
      const globalCol = startCol + col;
      const colorIdx = indices[globalRow * gridCols + globalCol];
      setTooltip({
        x: e.clientX - (canvasWrapRef.current?.getBoundingClientRect().left || 0),
        y: e.clientY - (canvasWrapRef.current?.getBoundingClientRect().top || 0),
        colorIdx,
        key: Date.now(),
      });
    }
  }, [zoom, activeSection, sectionCols, gridCols, gridRows, indices]);

  const toggleComplete = (idx: number) => {
    setCompletedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const printSection = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0"><img src="${dataUrl}" style="max-width:100%;max-height:100vh" onload="window.print()"/></body></html>`);
    win.document.close();
  };

  const completedCount = completedSections.size;

  return (
    <div ref={containerRef} className={`${isFullscreen ? "bg-background p-4 overflow-auto" : ""}`}>
      {/* Two-panel layout: desktop side-by-side, mobile stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* LEFT PANEL — Main grid canvas area */}
        <div className="flex flex-col gap-3 min-w-0">
          {/* Section nav + checkbox */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setActiveSection(Math.max(0, activeSection - 1))} disabled={activeSection === 0} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Badge variant="secondary" className="text-sm px-3 font-mono">
                {activeSection + 1} / {totalSections}
              </Badge>
              <Button variant="outline" size="icon" onClick={() => setActiveSection(Math.min(totalSections - 1, activeSection + 1))} disabled={activeSection === totalSections - 1} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={completedSections.has(activeSection)}
                onCheckedChange={() => toggleComplete(activeSection)}
                id="section-complete"
              />
              <label htmlFor="section-complete" className="text-xs text-muted-foreground cursor-pointer hidden sm:inline">
                {(vt.markComplete || "Marquer la section {n} comme terminée").replace("{n}", String(activeSection + 1))}
              </label>
              <label htmlFor="section-complete" className="text-xs text-muted-foreground cursor-pointer sm:hidden">
                ✓ {activeSection + 1}
              </label>
            </div>
          </div>

          {/* Canvas with floating toolbar */}
          <div className="relative">
            <div
              ref={canvasWrapRef}
              className="border border-border rounded-lg overflow-auto bg-white max-h-[65vh] cursor-grab select-none relative"
            >
              <canvas ref={canvasRef} className="mx-auto block" onClick={handleCanvasClick} />
              {tooltip && (
                <ColorTooltip
                  x={tooltip.x}
                  y={tooltip.y}
                  colorIdx={tooltip.colorIdx}
                  colorName={palette.colors[tooltip.colorIdx]?.name || ""}
                  colorHex={palette.colors[tooltip.colorIdx]?.hex || ""}
                  visible={true}
                  key={tooltip.key}
                />
              )}
            </div>

            {/* Floating toolbar */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
              <ViewerToolbar
                zoom={zoom}
                colorMode={colorMode}
                paintMode={paintMode}
                isFullscreen={isFullscreen}
                onZoomIn={() => setZoom(Math.min(3, zoom + 0.25))}
                onZoomOut={() => setZoom(Math.max(0.5, zoom - 0.25))}
                onColorMode={setColorMode}
                onPaintMode={setPaintMode}
                onPrint={printSection}
                onFullscreen={toggleFullscreen}
                colorLabel={vt.colorMode || "Couleur"}
                cleanLabel={vt.cleanMode || "Épuré"}
                paintLabel={vt.paintMode || "Peinture"}
              />
            </div>
          </div>

          {/* Mobile-only collapsibles */}
          <div className="lg:hidden space-y-2">
            <Collapsible open={minimapOpen} onOpenChange={setMinimapOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Map className="h-4 w-4 text-muted-foreground" />
                  {vt.overview || "Vue d'ensemble"}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${minimapOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="flex justify-center mb-3">
                  <img
                    src={smoothOverviewRef.current || previewDataUrl}
                    alt="Preview"
                    className="rounded-lg border border-border shadow-sm w-full max-w-xs"
                  />
                </div>
                <SectionMinimap
                  totalSections={totalSections}
                  sectionCols={sectionCols}
                  activeSection={activeSection}
                  completedSections={completedSections}
                  onSelect={setActiveSection}
                />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={paletteOpen} onOpenChange={setPaletteOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  {vt.palette || "Palette"} ({palette.colors.length} {vt.colors || "couleurs"})
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${paletteOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <PalettePanel
                  colors={palette.colors}
                  sectionColorStats={sectionColorStats}
                  highlightColor={highlightColor}
                  onHighlight={setHighlightColor}
                  cellsLabel={vt.cells || "cellules"}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* RIGHT PANEL — Desktop sidebar, sticky & scrollable */}
        <div className="hidden lg:flex flex-col gap-3 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">
          {/* Progress — compact inline */}
          <div className="bg-card border border-border rounded-lg px-3 py-2">
            <ProgressRing
              completed={completedCount}
              total={totalSections}
              doneLabel={vt.done || "terminé"}
            />
          </div>

          {/* Overview image + minimap */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Map className="h-3.5 w-3.5" />
              {vt.overview || "Vue d'ensemble"}
            </h3>
            <div ref={overlayContainerRef}>
              <canvas
                ref={overlayCanvasRef}
                className="rounded border border-border cursor-pointer w-full"
                onClick={(e) => {
                  const canvas = overlayCanvasRef.current;
                  if (!canvas) return;
                  const rect = canvas.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  const sc = Math.floor((x / rect.width) * sectionCols);
                  const sr = Math.floor((y / rect.height) * sectionRows);
                  const idx = sr * sectionCols + sc;
                  if (idx >= 0 && idx < totalSections) setActiveSection(idx);
                }}
              />
            </div>
            <div className="mt-2">
              <SectionMinimap
                totalSections={totalSections}
                sectionCols={sectionCols}
                activeSection={activeSection}
                completedSections={completedSections}
                onSelect={setActiveSection}
              />
            </div>
          </div>

          {/* Palette — scrollable within sidebar */}
          <div className="bg-card border border-border rounded-lg p-3 flex flex-col min-h-0">
            <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5 flex-shrink-0">
              <Palette className="h-3.5 w-3.5" />
              {vt.palette || "Palette"} ({palette.colors.length})
            </h3>
            <div className="overflow-y-auto flex-1 min-h-0">
              <PalettePanel
                colors={palette.colors}
                sectionColorStats={sectionColorStats}
                highlightColor={highlightColor}
                onHighlight={setHighlightColor}
                cellsLabel={vt.cells || "cellules"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
