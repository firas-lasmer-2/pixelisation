import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

function getTargetDate() {
  // Next Sunday midnight
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const target = new Date(now);
  target.setDate(target.getDate() + daysUntilSunday);
  target.setHours(23, 59, 59, 999);
  return target;
}

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState(calcTimeLeft());

  function calcTimeLeft() {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(calcTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  return timeLeft;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="bg-foreground/10 rounded px-1.5 py-0.5 text-sm font-bold font-mono tabular-nums min-w-[28px] text-center">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] uppercase tracking-wider mt-0.5 opacity-70">{label}</span>
    </div>
  );
}

export function PromoBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem("promo-dismissed") === "true";
  });
  const target = getTargetDate();
  const { hours, minutes, seconds } = useCountdown(target);

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("promo-dismissed", "true");
  };

  if (dismissed) return null;

  return (
    <div className="relative bg-accent text-accent-foreground">
      <Link
        to="/studio"
        className="container mx-auto flex items-center justify-center gap-3 px-4 py-2.5 text-center hover:opacity-90 transition-opacity"
      >
        <Sparkles className="h-4 w-4 shrink-0 animate-pulse" />
        <span className="text-sm font-semibold">
          🎨 Offre spéciale : <span className="underline underline-offset-2">-20%</span> ce week-end
        </span>
        <div className="flex items-center gap-1.5 ms-2">
          <CountdownUnit value={hours} label="h" />
          <span className="text-sm font-bold opacity-60">:</span>
          <CountdownUnit value={minutes} label="m" />
          <span className="text-sm font-bold opacity-60">:</span>
          <CountdownUnit value={seconds} label="s" />
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); dismiss(); }}
        className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-accent-foreground/10 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
