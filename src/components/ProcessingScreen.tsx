import { useState, useEffect } from "react";
import { Brush, Palette, Sparkles, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/i18n";

const STEPS = [
  { icon: Brush, delayMs: 0 },
  { icon: Palette, delayMs: 2500 },
  { icon: Sparkles, delayMs: 5500 },
];

// Palette color particles that float upward — each represents a style
const PARTICLES = [
  { color: "#d79c7b", size: 9,  left: "12%", delay: 0,    duration: 3.2 },
  { color: "#D4A660", size: 6,  left: "28%", delay: 0.9,  duration: 2.8 },
  { color: "#9db3d8", size: 11, left: "48%", delay: 1.5,  duration: 3.7 },
  { color: "#B890A0", size: 7,  left: "65%", delay: 0.4,  duration: 3.0 },
  { color: "#1848A0", size: 8,  left: "80%", delay: 2.1,  duration: 2.6 },
  { color: "#501808", size: 5,  left: "38%", delay: 1.1,  duration: 4.0 },
  { color: "#508898", size: 7,  left: "58%", delay: 2.6,  duration: 3.3 },
  { color: "#ec2b8c", size: 6,  left: "22%", delay: 1.8,  duration: 2.9 },
];

export function ProcessingScreen() {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  const [dotCount, setDotCount] = useState(1);
  const [iconVisible, setIconVisible] = useState(true);

  const labels = t.studio.processing?.steps || [
    "Analyse de votre photo...",
    "Application des styles artistiques...",
    "Génération des aperçus...",
  ];

  useEffect(() => {
    const timers = STEPS.slice(1).map((s, i) =>
      setTimeout(() => {
        // Fade icon out, swap, fade back in
        setIconVisible(false);
        setTimeout(() => {
          setActiveStep(i + 1);
          setIconVisible(true);
        }, 200);
      }, s.delayMs)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Smooth progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgressValue(prev => {
        const target = ((activeStep + 1) / STEPS.length) * 100;
        if (prev >= target - 0.4) return target;
        return prev + 0.35;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [activeStep]);

  // Animated dots cycle on active step
  useEffect(() => {
    const interval = setInterval(() => setDotCount(d => (d % 3) + 1), 450);
    return () => clearInterval(interval);
  }, []);

  const estimatedTime = t.studio.processing?.estimate || "~10 secondes restantes";
  const roundedProgress = Math.round(progressValue);
  const ActiveIcon = STEPS[activeStep]?.icon || Sparkles;

  return (
    <>
      <style>{`
        @keyframes ps-float {
          0%   { transform: translateY(0) scale(0.6); opacity: 0; }
          8%   { opacity: 0.85; }
          88%  { opacity: 0.5; }
          100% { transform: translateY(-110px) scale(1.3); opacity: 0; }
        }
        @keyframes ps-spin-halo {
          to { transform: rotate(360deg); }
        }
        @keyframes ps-ring-expand {
          0%   { transform: scale(0.75); opacity: 0.6; }
          100% { transform: scale(2.4);  opacity: 0; }
        }
        @keyframes ps-shimmer {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        @keyframes ps-step-in {
          0%   { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
        @keyframes ps-icon-swap {
          0%   { transform: scale(0.6) rotate(-12deg); opacity: 0; }
          100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
        }
        @keyframes ps-bob {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-5px); }
        }
      `}</style>

      <div className="relative flex flex-col items-center justify-center min-h-[60vh] gap-8 overflow-hidden">

        {/* Floating palette particles */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="absolute bottom-8 rounded-full"
              style={{
                width: p.size,
                height: p.size,
                left: p.left,
                backgroundColor: p.color,
                filter: "blur(0.8px)",
                animation: `ps-float ${p.duration}s ${p.delay}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        {/* Central animated icon area */}
        <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
          {/* 3 staggered expanding rings */}
          {[0, 0.7, 1.4].map((delay, i) => (
            <span
              key={i}
              className="absolute rounded-full border border-primary/25"
              style={{
                width: 88, height: 88,
                animation: `ps-ring-expand 2.6s ${delay}s ease-out infinite`,
              }}
            />
          ))}

          {/* Spinning conic-gradient halo */}
          <span
            className="absolute rounded-full"
            style={{
              width: 110, height: 110,
              background: "conic-gradient(from 0deg, #d79c7b, #D4A660, #9db3d8, #B890A0, #1848A0, #ec2b8c, #d79c7b)",
              animation: "ps-spin-halo 3s linear infinite",
              opacity: 0.55,
            }}
          />
          {/* Mask to create ring effect */}
          <span className="absolute rounded-full bg-background" style={{ width: 94, height: 94 }} />

          {/* Icon container */}
          <span
            className="relative flex items-center justify-center rounded-full bg-primary/10"
            style={{
              width: 80, height: 80,
              animation: "ps-bob 3.5s ease-in-out infinite",
            }}
          >
            <ActiveIcon
              className="text-primary"
              style={{
                width: 34, height: 34,
                animation: iconVisible
                  ? "ps-icon-swap 0.35s cubic-bezier(0.34,1.56,0.64,1) both"
                  : "none",
                opacity: iconVisible ? 1 : 0,
                transition: "opacity 0.15s",
              }}
            />
          </span>
        </div>

        <div className="text-center space-y-5 max-w-sm w-full px-4">
          <h2 className="text-2xl font-bold tracking-tight">
            {t.studio.processing?.title || "Création de vos portraits"}
          </h2>

          {/* Progress bar with shimmer + % counter */}
          <div className="space-y-1">
            <div className="relative h-2.5 rounded-full overflow-hidden bg-primary/10">
              {/* Filled portion */}
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                style={{ width: `${progressValue}%`, transition: "width 0.15s linear" }}
              />
              {/* Shimmer wave */}
              <span
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                  animation: "ps-shimmer 1.7s ease-in-out infinite",
                }}
              />
            </div>
            <div className="text-right text-xs font-medium text-primary/60">{roundedProgress}%</div>
          </div>

          {/* Steps */}
          <div className="space-y-2 text-left">
            {labels.map((label: string, i: number) => {
              const Icon = STEPS[i]?.icon || Sparkles;
              const isActive = i === activeStep;
              const isDone = i < activeStep;
              // Animate dots only on active label
              const baseLabel = label.replace(/\.+$/, "");
              const displayLabel = isActive
                ? baseLabel + ".".repeat(dotCount)
                : label;

              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors duration-500 ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium shadow-sm"
                      : isDone
                      ? "text-primary/50"
                      : "text-muted-foreground/50"
                  }`}
                  style={{ animation: `ps-step-in 0.45s ${i * 0.12}s both` }}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary/60" />
                  ) : (
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors duration-300 ${
                        isActive ? "text-primary" : "text-muted-foreground/30"
                      }`}
                      style={isActive ? { animation: "ps-bob 1.8s ease-in-out infinite" } : {}}
                    />
                  )}
                  <span>{displayLabel}</span>
                  {isActive && (
                    <span className="ms-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">{estimatedTime}</p>
        </div>
      </div>
    </>
  );
}
