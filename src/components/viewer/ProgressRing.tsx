import { useEffect, useState } from "react";
import { Check, PartyPopper } from "lucide-react";

interface ProgressRingProps {
  completed: number;
  total: number;
  doneLabel: string;
}

export function ProgressRing({ completed, total, doneLabel }: ProgressRingProps) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = completed === total && total > 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isComplete) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={isComplete ? "hsl(142 71% 45%)" : "hsl(var(--primary))"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isComplete ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <span className="text-sm font-bold text-foreground">{Math.round(pct)}%</span>
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground font-medium">
          {completed}/{total} {doneLabel}
        </span>
        {showConfetti && (
          <span className="text-[10px] text-green-600 dark:text-green-400 animate-fade-in font-medium flex items-center gap-1">
            <PartyPopper className="h-3 w-3" />
            Bravo !
          </span>
        )}
      </div>
    </div>
  );
}
