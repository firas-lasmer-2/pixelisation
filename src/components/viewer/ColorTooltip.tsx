import { useEffect, useState } from "react";
import { COLOR_LETTERS } from "@/lib/palettes";

interface ColorTooltipProps {
  x: number;
  y: number;
  colorIdx: number;
  colorName: string;
  colorHex: string;
  visible: boolean;
}

export function ColorTooltip({ x, y, colorIdx, colorName, colorHex, visible }: ColorTooltipProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
    setShow(false);
  }, [visible, x, y]);

  if (!show) return null;

  return (
    <div
      className="absolute z-50 pointer-events-none animate-fade-in"
      style={{ left: x, top: y - 48 }}
    >
      <div className="bg-popover text-popover-foreground border border-border rounded-lg px-3 py-1.5 shadow-lg text-xs flex items-center gap-2 whitespace-nowrap">
        <div
          className="w-3.5 h-3.5 rounded border border-border"
          style={{ backgroundColor: colorHex }}
        />
        <span className="font-bold">{COLOR_LETTERS[colorIdx]}</span>
        <span className="text-muted-foreground">{colorName}</span>
        <span className="text-muted-foreground/70">{colorHex}</span>
      </div>
    </div>
  );
}
