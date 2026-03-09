import { useState } from "react";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Ruler, Clock, Palette, Grid3X3 } from "lucide-react";

const CANVAS_SIZES = [
  {
    id: "A4",
    label: "A4",
    dimensions: "21 × 30 cm",
    widthCm: 21,
    heightCm: 30,
    cells: "~10 000",
    colors: "8",
    hours: "4–8h",
    level: "Débutant",
    levelColor: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    price: 249,
    accent: "border-emerald-500/40",
    bgAccent: "bg-emerald-500/5",
    ringColor: "ring-emerald-500/20",
  },
  {
    id: "30x40",
    label: "30×40",
    dimensions: "30 × 40 cm",
    widthCm: 30,
    heightCm: 40,
    cells: "19 200",
    colors: "12–15",
    hours: "8–20h",
    level: "Intermédiaire",
    levelColor: "text-primary bg-primary/10 border-primary/20",
    price: 349,
    accent: "border-primary/40",
    bgAccent: "bg-primary/5",
    ringColor: "ring-primary/20",
  },
  {
    id: "40x50",
    label: "40×50",
    dimensions: "40 × 50 cm",
    widthCm: 40,
    heightCm: 50,
    cells: "32 000",
    colors: "12–15",
    hours: "15–30h",
    level: "Avancé",
    levelColor: "text-accent bg-accent/10 border-accent/20",
    price: 449,
    accent: "border-accent/40",
    bgAccent: "bg-accent/5",
    ringColor: "ring-accent/20",
  },
];

// Scale factor: largest canvas height (50cm) maps to max visual height
const MAX_VISUAL_H = 220; // px
const SCALE = MAX_VISUAL_H / 50;

function CanvasFrame({
  size,
  isActive,
  onClick,
}: {
  size: (typeof CANVAS_SIZES)[0];
  isActive: boolean;
  onClick: () => void;
}) {
  const w = size.widthCm * SCALE;
  const h = size.heightCm * SCALE;

  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center gap-4 transition-all duration-500 ${
        isActive ? "scale-105" : "scale-95 opacity-60 hover:opacity-80"
      }`}
    >
      {/* Canvas frame */}
      <div className="relative">
        {/* Shadow */}
        <div
          className={`absolute inset-0 rounded-sm transition-all duration-500 ${
            isActive ? "shadow-2xl shadow-primary/20" : "shadow-md shadow-foreground/5"
          }`}
          style={{ width: w, height: h }}
        />
        {/* Frame border */}
        <div
          className={`relative rounded-sm border-[3px] transition-all duration-500 ${
            isActive ? `${size.accent} ${size.bgAccent}` : "border-border bg-card"
          }`}
          style={{ width: w, height: h }}
        >
          {/* Inner canvas texture */}
          <div className="absolute inset-1 rounded-[1px] bg-gradient-to-br from-secondary/30 via-background to-secondary/20" />
          {/* Grid pattern overlay */}
          <div
            className={`absolute inset-1 transition-opacity duration-500 ${
              isActive ? "opacity-30" : "opacity-10"
            }`}
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)",
              backgroundSize: `${w / 8}px ${h / 8}px`,
            }}
          />
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`font-serif font-bold transition-all duration-500 ${
                isActive ? "text-foreground text-lg" : "text-muted-foreground text-sm"
              }`}
            >
              {size.label}
            </span>
          </div>
        </div>
        {/* Dimension labels */}
        <div
          className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-medium whitespace-nowrap transition-colors duration-300 ${
            isActive ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {size.dimensions}
        </div>
      </div>
    </button>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ruler;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function SizeVisualComparison() {
  const ref = useScrollReveal();
  const [activeIdx, setActiveIdx] = useState(2); // 40x50 default
  const active = CANVAS_SIZES[activeIdx];

  return (
    <section className="py-24 md:py-32 overflow-hidden" id="sizes">
      <div className="container mx-auto px-4">
        <div ref={ref} className="text-center mb-16 scroll-reveal">
          <Badge
            variant="secondary"
            className="mb-4 text-xs tracking-widest uppercase border-primary/20 bg-primary/5 text-primary"
          >
            Tailles
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold font-serif tracking-tight text-foreground">
            Comparez les dimensions
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-base">
            Cliquez sur un format pour voir ses caractéristiques en détail.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Visual canvas comparison */}
          <div className="flex items-end justify-center gap-6 md:gap-10 mb-16 pt-4 pb-8">
            {CANVAS_SIZES.map((size, i) => (
              <CanvasFrame
                key={size.id}
                size={size}
                isActive={i === activeIdx}
                onClick={() => setActiveIdx(i)}
              />
            ))}
          </div>

          {/* Detail card for active size */}
          <div
            key={active.id}
            className="relative rounded-2xl border border-border bg-card p-6 md:p-8 shadow-lg shadow-primary/5 animate-fade-in"
          >
            {/* Accent top strip */}
            <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${active.bgAccent} ${active.accent}`} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Left: title + badge */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold font-serif text-foreground">
                    {active.dimensions}
                  </h3>
                  <Badge className={`text-[10px] font-semibold border ${active.levelColor}`}>
                    {active.level}
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-primary">
                  {active.price} DT
                </p>
              </div>

              {/* Right: stats grid */}
              <div className="grid grid-cols-2 gap-4 md:gap-x-8">
                <StatItem icon={Grid3X3} label="Cellules" value={active.cells} />
                <StatItem icon={Palette} label="Couleurs" value={active.colors} />
                <StatItem icon={Clock} label="Durée" value={active.hours} />
                <StatItem icon={Ruler} label="Format" value={active.dimensions} />
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 flex justify-center md:justify-end">
              <Button asChild className="rounded-full gap-2 px-8 font-semibold bg-accent hover:bg-accent/90 text-accent-foreground shadow-md shadow-accent/20">
                <Link to="/studio">
                  Commencer avec ce format
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
