import { useState, useEffect } from "react";
import { Loader2, Brush, Palette, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/i18n";

const STEPS = [
  { icon: Brush, delayMs: 0 },
  { icon: Palette, delayMs: 2000 },
  { icon: Sparkles, delayMs: 4000 },
];

export function ProcessingScreen() {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [progressValue, setProgressValue] = useState(0);

  const labels = t.studio.processing?.steps || [
    "Analyse de votre photo...",
    "Application des styles artistiques...",
    "Génération des aperçus...",
  ];

  useEffect(() => {
    const timers = STEPS.slice(1).map((s, i) =>
      setTimeout(() => setActiveStep(i + 1), s.delayMs)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Smooth progress animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgressValue(prev => {
        const target = ((activeStep + 1) / STEPS.length) * 100;
        if (prev >= target - 1) return target;
        return prev + 0.5;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [activeStep]);

  const estimatedTime = t.studio.processing?.estimate || "~10 secondes restantes";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-2xl bg-primary/5 animate-ping" style={{ animationDuration: "2s" }} />
      </div>

      <div className="text-center space-y-6 max-w-sm">
        <h2 className="text-2xl font-bold tracking-tight">
          {t.studio.processing?.title || "Création de vos portraits"}
        </h2>

        {/* Progress bar */}
        <Progress value={progressValue} className="h-2" />

        <div className="space-y-3">
          {labels.map((label: string, i: number) => {
            const Icon = STEPS[i]?.icon || Sparkles;
            const isActive = i === activeStep;
            const isDone = i < activeStep;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all duration-500 ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : isDone
                    ? "text-primary/60"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "animate-pulse" : ""}`} />
                <span>{label}</span>
                {isDone && <span className="ms-auto text-xs">✓</span>}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">{estimatedTime}</p>
      </div>
    </div>
  );
}
