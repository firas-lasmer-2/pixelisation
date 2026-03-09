import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Check, Share2, Home, ImagePlus, Trash2, Trophy } from "lucide-react";

interface ProgressEntry {
  stage: number;
  label: string;
  imageUrl: string | null;
  date: string | null;
}

const STAGES = [
  { pct: 25, label: "Début — premières couleurs", emoji: "🎨" },
  { pct: 50, label: "Mi-parcours — ça prend forme", emoji: "🖌️" },
  { pct: 75, label: "Presque fini — les détails", emoji: "✨" },
  { pct: 100, label: "Chef-d'œuvre terminé !", emoji: "🏆" },
];

function getStorageKey(code: string) {
  return `flink-progress-${code}`;
}

function loadProgress(code: string): ProgressEntry[] {
  try {
    const raw = localStorage.getItem(getStorageKey(code));
    if (raw) return JSON.parse(raw);
  } catch {}
  return STAGES.map((s, i) => ({ stage: s.pct, label: s.label, imageUrl: null, date: null }));
}

function saveProgress(code: string, entries: ProgressEntry[]) {
  localStorage.setItem(getStorageKey(code), JSON.stringify(entries));
}

const MyPainting = () => {
  const { code } = useParams<{ code: string }>();
  const [entries, setEntries] = useState<ProgressEntry[]>(() => loadProgress(code || ""));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeStage, setActiveStage] = useState<number | null>(null);

  const completedCount = entries.filter((e) => e.imageUrl).length;
  const progressPct = completedCount > 0 ? [...entries].reverse().find((e) => e.imageUrl)!.stage : 0;
  const isComplete = completedCount === 4;

  useEffect(() => {
    if (code) saveProgress(code, entries);
  }, [entries, code]);

  const handleUpload = (stageIndex: number) => {
    setActiveStage(stageIndex);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeStage === null) return;

    const reader = new FileReader();
    reader.onload = () => {
      const updated = [...entries];
      updated[activeStage] = {
        ...updated[activeStage],
        imageUrl: reader.result as string,
        date: new Date().toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric" }),
      };
      setEntries(updated);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], imageUrl: null, date: null };
    setEntries(updated);
  };

  const shareProgress = () => {
    const msg = `🎨 Mon parcours de peinture Flink Atelier — ${progressPct}% terminé !\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (!code) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Code introuvable.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      <div className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Mon parcours de peinture</h1>
              <p className="text-muted-foreground">Photographiez votre progression et partagez votre aventure artistique</p>
            </div>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{progressPct}% terminé</span>
                {isComplete && (
                  <Badge className="gap-1 bg-primary text-primary-foreground">
                    <Trophy className="h-3 w-3" />
                    Terminé !
                  </Badge>
                )}
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              {entries.map((entry, i) => {
                const stage = STAGES[i];
                const hasPhoto = !!entry.imageUrl;
                const isPrevDone = i === 0 || !!entries[i - 1].imageUrl;

                return (
                  <Card
                    key={i}
                    className={`overflow-hidden transition-all ${
                      hasPhoto ? "border-primary/30" : ""
                    } ${!isPrevDone && !hasPhoto ? "opacity-50" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Stage indicator */}
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg ${
                          hasPhoto ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          {hasPhoto ? <Check className="h-5 w-5" /> : stage.emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{stage.pct}%</span>
                            <span className="text-sm text-muted-foreground">{stage.label}</span>
                          </div>

                          {hasPhoto ? (
                            <div className="mt-2">
                              <div className="relative group rounded-lg overflow-hidden">
                                <img
                                  src={entry.imageUrl!}
                                  alt={`Progression ${stage.pct}%`}
                                  className="w-full aspect-[4/3] object-cover rounded-lg"
                                />
                                <button
                                  onClick={() => removePhoto(i)}
                                  className="absolute top-2 end-2 p-1.5 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1.5">{entry.date}</p>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpload(i)}
                              disabled={!isPrevDone}
                              className="mt-2 gap-2"
                            >
                              <Camera className="h-3.5 w-3.5" />
                              Ajouter une photo
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              {progressPct > 0 && (
                <Button onClick={shareProgress} variant="outline" className="rounded-full gap-2">
                  <Share2 className="h-4 w-4" />
                  Partager mon parcours
                </Button>
              )}
              <Button asChild variant="ghost" className="rounded-full gap-2">
                <Link to="/">
                  <Home className="h-4 w-4" />
                  Retour à l'accueil
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default MyPainting;
