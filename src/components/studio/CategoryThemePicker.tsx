import { Check, Sparkles } from "lucide-react";
import { CATEGORY_THEMES, type OrderCategory } from "@/lib/store";
import { cn } from "@/lib/utils";

type ThemePresentation = {
  headline: string;
  description: string;
  chips: string[];
};

const THEME_SECTION_COPY: Partial<Record<OrderCategory, { eyebrow: string; intro: string }>> = {
  family: {
    eyebrow: "Portrait de famille",
    intro: "Choisissez une ambiance douce et cohérente pour garder le portrait lisible, chaleureux et premium.",
  },
  pet: {
    eyebrow: "Portrait animalier",
    intro: "Un bon thème met en valeur le regard et la silhouette de votre animal sans encombrer l'image.",
  },
  superhero: {
    eyebrow: "Portrait héroïque",
    intro: "Privilégiez une direction claire et cinématographique, avec un sujet fort et un décor maîtrisé.",
  },
  couple: {
    eyebrow: "Portrait à deux",
    intro: "L'ambiance choisie doit rester élégante et équilibrée pour donner la même importance aux deux visages.",
  },
  historical: {
    eyebrow: "Portrait inspiré d'époque",
    intro: "Chaque thème apporte une lecture visuelle différente, tout en gardant le sujet central et facile à peindre.",
  },
  scifi: {
    eyebrow: "Portrait futuriste",
    intro: "Cherchez une ambiance forte mais lisible, avec des détails mémorables et un fond volontairement simplifié.",
  },
  anime: {
    eyebrow: "Portrait illustré",
    intro: "Un bon thème anime reste expressif, net et concentré sur le visage plutôt que sur les effets.",
  },
};

const THEME_PRESENTATION: Record<string, ThemePresentation> = {
  generic: {
    headline: "Version héroïque universelle",
    description: "Un costume affirmé, une pose sûre et un décor discret pour mettre le sujet en avant.",
    chips: ["Pose forte", "Fond épuré", "Lecture nette"],
  },
  superman: {
    headline: "Puissant et lumineux",
    description: "Une présence noble, une tenue iconique et un rendu propre orienté portrait.",
    chips: ["Allure noble", "Couleurs franches", "Sujet central"],
  },
  batman: {
    headline: "Sombre et sophistiqué",
    description: "Une ambiance nocturne maîtrisée avec du contraste, sans noyer le visage dans le décor.",
    chips: ["Contraste chic", "Studio sombre", "Visage lisible"],
  },
  "spider-man": {
    headline: "Énergique et moderne",
    description: "Un héros dynamique traité en portrait rapproché, avec très peu de distraction autour.",
    chips: ["Énergie urbaine", "Cadre serré", "Fond léger"],
  },
  "wonder-woman": {
    headline: "Majestueux et inspirant",
    description: "Une direction élégante et puissante qui garde le sujet comme point focal absolu.",
    chips: ["Grace forte", "Lumière douce", "Sujet affirmé"],
  },
  "iron-man": {
    headline: "Futuriste et premium",
    description: "Une armure détaillée mais un cadre simplifié, pour un rendu plus propre à transformer.",
    chips: ["Armure lisible", "Fond maîtrisé", "Brillance contrôlée"],
  },
  captain: {
    headline: "Héroïsme classique",
    description: "Une ambiance franche et digne, axée sur la silhouette et l'expression.",
    chips: ["Esprit noble", "Lecture immédiate", "Portrait net"],
  },
  thor: {
    headline: "Épique sans surcharge",
    description: "Une force visuelle marquée, mais avec un arrière-plan volontairement atténué.",
    chips: ["Impact fort", "Fond simplifié", "Pose héroïque"],
  },
  "black-panther": {
    headline: "Intense et raffiné",
    description: "Un rendu premium, contrasté et précis qui valorise les volumes sans bruit visuel.",
    chips: ["Lignes pures", "Tension maîtrisée", "Détails forts"],
  },
  romantic: {
    headline: "Douceur intemporelle",
    description: "Une ambiance tendre et lumineuse, pensée pour garder l'émotion et l'équilibre des visages.",
    chips: ["Émotion douce", "Palette chaude", "Portrait équilibré"],
  },
  paris: {
    headline: "Chic parisien",
    description: "Une note élégante et citadine, avec un fond suggéré plutôt que détaillé.",
    chips: ["Élégance", "Fond suggéré", "Rendu raffiné"],
  },
  beach: {
    headline: "Lumineux et aéré",
    description: "Une scène romantique avec une lumière propre et un décor volontairement léger.",
    chips: ["Lumière claire", "Duo harmonieux", "Décor doux"],
  },
  forest: {
    headline: "Poétique et naturel",
    description: "Une ambiance organique, douce et lisible, sans excès de végétation dans le cadre.",
    chips: ["Nature douce", "Fond flou", "Visages centraux"],
  },
  cafe: {
    headline: "Intime et éditorial",
    description: "Un rendu chaleureux avec une atmosphère de café suggérée et très bien contrôlée.",
    chips: ["Chaleur", "Ambiance édito", "Décor minimal"],
  },
  tuscany: {
    headline: "Romance solaire",
    description: "Une lumière dorée et une scène élégante, pensée pour rester claire et lisible.",
    chips: ["Lumière dorée", "Atmosphère noble", "Décor maîtrisé"],
  },
  renaissance: {
    headline: "Peinture de prestige",
    description: "Un portrait inspiré des maîtres, avec une composition posée et un fond très sobre.",
    chips: ["Posture noble", "Fond pictural", "Lecture classique"],
  },
  victorian: {
    headline: "Élégance raffinée",
    description: "Une silhouette travaillée et une ambiance d'époque, sans surcharge d'accessoires.",
    chips: ["Raffinement", "Portrait posé", "Détails choisis"],
  },
  egypt: {
    headline: "Mystique et graphique",
    description: "Une inspiration antique avec des repères forts mais un décor contenu.",
    chips: ["Symboles forts", "Composition simple", "Sujet mis en avant"],
  },
  "belle-epoque": {
    headline: "Délicat et artistique",
    description: "Une ambiance élégante, florale et douce qui reste bien cadrée sur le sujet.",
    chips: ["Esprit artistique", "Touche florale", "Portrait doux"],
  },
  rome: {
    headline: "Noble et monumental",
    description: "Une inspiration antique traitée avec retenue pour garder la lisibilité du portrait.",
    chips: ["Prestance", "Décor discret", "Volumes nets"],
  },
  cyberpunk: {
    headline: "Futuriste contrôlé",
    description: "Des accents néon et une identité visuelle forte, mais un fond volontairement simplifié.",
    chips: ["Néon maîtrisé", "Sujet net", "Fond minimal"],
  },
  space: {
    headline: "Explorateur premium",
    description: "Une esthétique spatiale propre, axée sur le costume et l'expression.",
    chips: ["Aura spatiale", "Portrait fort", "Décor discret"],
  },
  dystopia: {
    headline: "Tension cinématographique",
    description: "Une direction dramatique mais lisible, sans accumulation de ruines ou d'effets.",
    chips: ["Ambiance forte", "Cadre propre", "Sujet dominant"],
  },
  starwars: {
    headline: "Épopée galactique",
    description: "Un imaginaire spatial emblématique avec un portrait clair et parfaitement centré.",
    chips: ["Esprit épique", "Sujet central", "Effets limités"],
  },
  "anime-general": {
    headline: "Anime élégant",
    description: "Une illustration nette, expressive et propre, pensée pour de belles zones de couleur.",
    chips: ["Lignes claires", "Expression forte", "Fond simple"],
  },
  ghibli: {
    headline: "Poésie douce",
    description: "Une direction tendre et rêveuse, avec une composition apaisée et très lisible.",
    chips: ["Rendu doux", "Esprit rêveur", "Couleurs posées"],
  },
  action: {
    headline: "Shonen maîtrisé",
    description: "Un portrait énergique avec des codes d'action, sans envahir le cadre d'effets.",
    chips: ["Énergie forte", "Cadre serré", "Impact propre"],
  },
  romance: {
    headline: "Délicat et lumineux",
    description: "Une ambiance sentimentale et légère, centrée sur le regard et la douceur des tons.",
    chips: ["Lumière tendre", "Émotion claire", "Fond léger"],
  },
  chibi: {
    headline: "Kawaii assumé",
    description: "Un style adorable et très graphique, avec une lecture immédiate du personnage.",
    chips: ["Volume simple", "Univers joyeux", "Couleurs franches"],
  },
  royal: {
    headline: "Majesté animalière",
    description: "Un portrait noble et frontal qui sublime le regard de votre animal.",
    chips: ["Regard fort", "Attitude noble", "Fond élégant"],
  },
  watercolor: {
    headline: "Douceur artistique",
    description: "Une interprétation légère et raffinée, avec une belle respiration visuelle.",
    chips: ["Tons doux", "Texture subtile", "Portrait sensible"],
  },
  fantasy: {
    headline: "Aventure fantastique",
    description: "Une mise en scène de caractère avec un univers suggéré, pas envahissant.",
    chips: ["Esprit épique", "Sujet visible", "Fond contrôlé"],
  },
  modern: {
    headline: "Contemporain et chic",
    description: "Une direction épurée et graphique qui valorise la silhouette et le pelage.",
    chips: ["Minimalisme", "Impact visuel", "Rendu premium"],
  },
  "warm-studio": {
    headline: "Chaleur éditoriale",
    description: "Une ambiance studio douce et élégante, idéale pour un portrait de famille intemporel.",
    chips: ["Studio doux", "Visages équilibrés", "Rendu premium"],
  },
  outdoor: {
    headline: "Lumière naturelle",
    description: "Une sensation de plein air lumineuse, avec un arrière-plan très simplifié.",
    chips: ["Fraîcheur", "Lumière claire", "Fond flou"],
  },
  formal: {
    headline: "Portrait élégant",
    description: "Un rendu plus habillé et posé, conçu pour une image nette et harmonieuse.",
    chips: ["Allure chic", "Composition stable", "Lecture immédiate"],
  },
};

const CATEGORY_SURFACES: Partial<Record<OrderCategory, string>> = {
  family: "from-amber-50 via-white to-rose-50",
  pet: "from-amber-50 via-white to-yellow-50",
  superhero: "from-red-50 via-white to-orange-50",
  couple: "from-pink-50 via-white to-rose-50",
  historical: "from-yellow-50 via-white to-amber-50",
  scifi: "from-cyan-50 via-white to-slate-50",
  anime: "from-violet-50 via-white to-pink-50",
};

interface CategoryThemePickerProps {
  category: OrderCategory;
  selected: string;
  onSelect: (key: string) => void;
}

export function CategoryThemePicker({ category, selected, onSelect }: CategoryThemePickerProps) {
  const themes = CATEGORY_THEMES[category];
  if (!themes || themes.length === 0) return null;

  const selectedTheme = themes.find((theme) => theme.key === selected) || themes[0];
  const selectedPresentation = THEME_PRESENTATION[selectedTheme.key];
  const sectionCopy = THEME_SECTION_COPY[category];
  const surfaceClass = CATEGORY_SURFACES[category] || "from-primary/5 via-white to-amber-50";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className={cn("overflow-hidden rounded-[28px] border border-black/[0.06] bg-gradient-to-br p-5 shadow-[0_18px_45px_-34px_rgba(0,0,0,0.3)] sm:p-6", surfaceClass)}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {sectionCopy?.eyebrow || "Direction artistique"}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {sectionCopy?.intro}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/80 bg-white/90 px-5 py-4 shadow-sm backdrop-blur lg:w-[310px]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl">
                {selectedTheme.icon}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Thème sélectionné
                </p>
                <h3
                  className="mt-1 text-lg font-bold text-foreground"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {selectedTheme.label}
                </h3>
                {selectedPresentation && (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {selectedPresentation.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {themes.map((theme) => {
          const isSelected = selected === theme.key;
          const presentation = THEME_PRESENTATION[theme.key];

          return (
            <button
              key={theme.key}
              type="button"
              onClick={() => onSelect(theme.key)}
              className={cn(
                "group relative overflow-hidden rounded-[28px] border p-5 text-left transition-all duration-300 ease-out hover:-translate-y-0.5 sm:p-6",
                isSelected
                  ? "border-primary/25 bg-primary/[0.035] shadow-[0_18px_42px_-26px_rgba(0,0,0,0.28)]"
                  : "border-black/[0.06] bg-[#FCFCFB] hover:border-black/12 hover:bg-white hover:shadow-[0_18px_42px_-30px_rgba(0,0,0,0.22)]",
              )}
            >
              <div className={cn(
                "absolute inset-x-0 top-0 h-24 bg-gradient-to-r opacity-80 transition-opacity duration-300",
                isSelected ? "from-primary/10 via-primary/5 to-transparent" : "from-black/[0.03] via-transparent to-transparent",
              )} />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border text-2xl shadow-sm",
                    isSelected ? "border-primary/20 bg-white text-primary" : "border-black/[0.05] bg-white text-foreground",
                  )}>
                    {theme.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {presentation?.headline || "Thème signature"}
                    </p>
                    <h3
                      className="mt-1 text-xl font-bold text-foreground"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {theme.label}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {presentation?.description || "Une ambiance pensée pour rester élégante, lisible et centrée sur le sujet."}
                    </p>
                  </div>
                </div>

                <div className={cn(
                  "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  isSelected ? "border-primary bg-primary" : "border-black/12 bg-white",
                )}>
                  {isSelected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                </div>
              </div>

              <div className="relative mt-5 flex flex-wrap gap-2">
                {(presentation?.chips || ["Sujet prioritaire", "Fond simplifié", "Rendu premium"]).map((chip) => (
                  <span
                    key={chip}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      isSelected ? "bg-primary/10 text-primary" : "bg-black/[0.04] text-foreground/70",
                    )}
                  >
                    {chip}
                  </span>
                ))}
              </div>

              {isSelected && (
                <div className="relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                  <Sparkles className="h-3 w-3" />
                  Sélection active
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
