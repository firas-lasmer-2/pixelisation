import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ImageIcon, Loader2, Sparkles, Timer, Wand2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface AIGenerationLoadingPanelProps {
  photoUrls: string[];
  categoryLabel: string;
}

const ROTATING_TIPS = [
  "Nous simplifions l'arriere-plan pour un meilleur rendu peinture par numeros.",
  "Nous gardons les visages nets et bien reconnaissables.",
  "Nous finalisons une sortie carree HD adaptee au traitement Helma.",
];

const STAGES = [
  {
    label: "Preparation des photos",
    description: "Verification du cadrage et des references.",
    minSeconds: 0,
    icon: ImageIcon,
  },
  {
    label: "Creation du portrait",
    description: "Le moteur IA construit votre composition principale.",
    minSeconds: 18,
    icon: Wand2,
  },
  {
    label: "Nettoyage du fond",
    description: "Nous privilegions un rendu plus propre pour le kit final.",
    minSeconds: 52,
    icon: Sparkles,
  },
  {
    label: "Finalisation HD",
    description: "Export haute qualite et preparation de l'aperçu.",
    minSeconds: 92,
    icon: CheckCircle2,
  },
];

function getLoadingProgress(elapsedSeconds: number) {
  if (elapsedSeconds <= 20) {
    return Math.min(34, Math.round(10 + elapsedSeconds * 1.2));
  }

  if (elapsedSeconds <= 70) {
    return Math.min(72, Math.round(34 + (elapsedSeconds - 20) * 0.76));
  }

  if (elapsedSeconds <= 120) {
    return Math.min(94, Math.round(72 + (elapsedSeconds - 70) * 0.44));
  }

  return 95;
}

export function AIGenerationLoadingPanel({ photoUrls, categoryLabel }: AIGenerationLoadingPanelProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const progress = useMemo(() => getLoadingProgress(elapsedSeconds), [elapsedSeconds]);
  const activeStageIndex = useMemo(() => {
    let index = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (elapsedSeconds >= STAGES[i].minSeconds) {
        index = i;
      }
    }
    return index;
  }, [elapsedSeconds]);

  const activeStage = STAGES[activeStageIndex];
  const ActiveIcon = activeStage.icon;
  const tip = ROTATING_TIPS[Math.floor(elapsedSeconds / 6) % ROTATING_TIPS.length];

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-primary/15 bg-[radial-gradient(circle_at_top,_rgba(230,194,122,0.22),_rgba(255,255,255,0.98)_42%,_rgba(246,241,232,1)_100%)] p-6 shadow-[0_24px_80px_-30px_rgba(0,0,0,0.18)]">
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-amber-100/70 blur-3xl" />

      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <Badge variant="secondary" className="w-fit rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Generation premium
            </Badge>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                Nous creons votre portrait {categoryLabel.toLowerCase()}
              </h3>
              <p className="max-w-xl text-sm text-muted-foreground">
                Cette etape peut prendre jusqu'a 2 minutes quand le fournisseur IA est charge. Nous gardons les details du visage et reduisons les fonds complexes pour un meilleur rendu final.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm">
            <Timer className="h-3.5 w-3.5 text-primary" />
            {elapsedSeconds < 120 ? `${elapsedSeconds}s ecoulees` : "Plus de 2 min"}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-black/[0.05] bg-white/88 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ActiveIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Etape en cours</p>
                <p className="text-lg font-bold text-foreground">{activeStage.label}</p>
              </div>
              <Loader2 className="ms-auto h-5 w-5 animate-spin text-primary" />
            </div>

            <p className="mt-4 text-sm text-muted-foreground">{activeStage.description}</p>

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Progression estimee</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2.5 rounded-full bg-primary/10" />
            </div>

            <div className="mt-5 grid gap-2">
              {STAGES.map((stage, index) => {
                const Icon = stage.icon;
                const isDone = index < activeStageIndex;
                const isActive = index === activeStageIndex;

                return (
                  <div
                    key={stage.label}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : isDone
                        ? "bg-primary/[0.05] text-foreground/80"
                        : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/60"}`} />
                    )}
                    <span className="text-sm font-medium">{stage.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-black/[0.05] bg-white/88 p-5 shadow-sm backdrop-blur">
              <p className="text-sm font-semibold text-foreground">References utilisees</p>
              <div className={`mt-4 grid gap-3 ${photoUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {photoUrls.map((photoUrl, index) => (
                  <div key={`${photoUrl}-${index}`} className="overflow-hidden rounded-2xl border border-primary/10 bg-[#FAFAFA] shadow-sm">
                    <img src={photoUrl} alt={`Reference ${index + 1}`} className="aspect-square w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-primary/10 bg-[#fffdf8] p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Optimisation qualite</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{tip}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
