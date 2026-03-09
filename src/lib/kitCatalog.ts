import { getPaintingStats } from "@/lib/paintingLayout";

export const KIT_IDS = [
  "stamp_kit_40x50",
  "stamp_kit_30x40",
  "stamp_kit_A4",
  "stamp_kit_A3",
  "stamp_kit_A2",
] as const;

export type KitSize = (typeof KIT_IDS)[number];

export const PROCESSING_KIT_IDS = ["40x50", "30x40", "A4", "A3", "A2"] as const;
export type ProcessingKitSize = (typeof PROCESSING_KIT_IDS)[number];

export type KitTone = "emerald" | "gold" | "accent" | "purple";
export type KitBadgeIcon = "sparkles" | "star" | "crown";

export interface KitCatalogEntry {
  id: KitSize;
  processingKey: ProcessingKitSize;
  shortLabel: string;
  displayLabel: string;
  manifestLabel: string;
  dimensionsLabel: string;
  widthCm: number;
  heightCm: number;
  price: number;
  originalPrice: number;
  gridCols: number;
  gridRows: number;
  colorsLabel: string;
  hoursLabel: string;
  difficultyLevel: number;
  displayDifficultyLabel: string;
  manifestDifficultyLabel: string;
  headline: string;
  summary: string;
  idealFor: string;
  chooserNote: string;
  featureBullets: string[];
  tone: KitTone;
  badge?: {
    label: string;
    icon: KitBadgeIcon;
  };
  publicVisible: boolean;
  legacyOnly: boolean;
  recommended: boolean;
}

export const KIT_TONE_STYLES: Record<
  KitTone,
  {
    text: string;
    badge: string;
    accentStrip: string;
    border: string;
    glowBorder: string;
    softBg: string;
    ring: string;
  }
> = {
  emerald: {
    text: "text-green-600",
    badge: "bg-green-50 text-green-700 border-green-200",
    accentStrip: "card-accent-green",
    border: "border-green-200/70",
    glowBorder: "border-green-300/60",
    softBg: "bg-green-50/70",
    ring: "ring-green-200/60",
  },
  gold: {
    text: "text-primary",
    badge: "bg-primary/10 text-primary border-primary/20",
    accentStrip: "card-accent-gold",
    border: "border-primary/20",
    glowBorder: "border-primary/40",
    softBg: "bg-primary/[0.04]",
    ring: "ring-primary/20",
  },
  accent: {
    text: "text-accent",
    badge: "bg-accent/10 text-accent border-accent/20",
    accentStrip: "card-accent-burgundy",
    border: "border-accent/20",
    glowBorder: "border-accent/40",
    softBg: "bg-accent/[0.04]",
    ring: "ring-accent/20",
  },
  purple: {
    text: "text-violet-700",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    accentStrip: "card-accent-burgundy",
    border: "border-violet-200/70",
    glowBorder: "border-violet-300/60",
    softBg: "bg-violet-50/70",
    ring: "ring-violet-200/60",
  },
};

export const KIT_CATALOG: Record<KitSize, KitCatalogEntry> = {
  stamp_kit_A4: {
    id: "stamp_kit_A4",
    processingKey: "A4",
    shortLabel: "A4",
    displayLabel: "A4 (21 × 29,7 cm)",
    manifestLabel: "A4 (21 x 29,7 cm)",
    dimensionsLabel: "21 × 29,7 cm",
    widthCm: 21,
    heightCm: 29.7,
    price: 249,
    originalPrice: 329,
    gridCols: 84,
    gridRows: 119,
    colorsLabel: "10-12",
    hoursLabel: "4-8 h",
    difficultyLevel: 1,
    displayDifficultyLabel: "Débutant",
    manifestDifficultyLabel: "Debutant",
    headline: "Rapide, doux, accessible",
    summary: "Ancien petit format Helma. Il reste compatible pour les anciennes commandes, mais n'est plus proposé dans les nouveaux parcours.",
    idealFor: "une commande legacy déjà commencée",
    chooserNote: "Ancien petit format conservé uniquement pour les commandes existantes.",
    featureBullets: [
      "Toujours pris en charge pour les anciens paniers et manifests.",
      "Compatible avec le PDF, le viewer et les commandes déjà confirmées.",
      "N'est plus proposé dans la nouvelle sélection publique.",
    ],
    tone: "emerald",
    badge: {
      label: "Legacy",
      icon: "sparkles",
    },
    publicVisible: false,
    legacyOnly: true,
    recommended: false,
  },
  stamp_kit_A3: {
    id: "stamp_kit_A3",
    processingKey: "A3",
    shortLabel: "A3",
    displayLabel: "A3 (29,7 × 42 cm)",
    manifestLabel: "A3 (29,7 x 42 cm)",
    dimensionsLabel: "29,7 × 42 cm",
    widthCm: 29.7,
    heightCm: 42,
    price: 299,
    originalPrice: 389,
    gridCols: 118,
    gridRows: 168,
    colorsLabel: "12-15",
    hoursLabel: "8-20 h",
    difficultyLevel: 2,
    displayDifficultyLabel: "Intermédiaire",
    manifestDifficultyLabel: "Intermediaire",
    headline: "Le nouveau standard recommandé",
    summary: "Le plus petit format public qui garde déjà un vrai niveau de netteté. C'est désormais le point d'entrée Helma recommandé.",
    idealFor: "la plupart des portraits, cadeaux et premières commandes sérieuses",
    chooserNote: "Le meilleur point de départ si vous voulez plus de détail qu'un A4 sans passer tout de suite aux grands formats.",
    featureBullets: [
      "Format papier standard facile à encadrer.",
      "Résolution proche d'un 30×40 dans un format plus compact.",
      "Le meilleur nouveau point d'entrée pour une qualité nette.",
    ],
    tone: "gold",
    badge: {
      label: "Recommandé",
      icon: "sparkles",
    },
    publicVisible: true,
    legacyOnly: false,
    recommended: true,
  },
  stamp_kit_30x40: {
    id: "stamp_kit_30x40",
    processingKey: "30x40",
    shortLabel: "30×40",
    displayLabel: "30 × 40 cm",
    manifestLabel: "30 x 40 cm",
    dimensionsLabel: "30 × 40 cm",
    widthCm: 30,
    heightCm: 40,
    price: 349,
    originalPrice: 429,
    gridCols: 120,
    gridRows: 160,
    colorsLabel: "12-15",
    hoursLabel: "8-20 h",
    difficultyLevel: 2,
    displayDifficultyLabel: "Intermédiaire",
    manifestDifficultyLabel: "Intermediaire",
    headline: "Notre format équilibré",
    summary: "Le format Helma le plus polyvalent. Très bon compromis entre présence au mur, niveau de détail et temps de peinture.",
    idealFor: "les portraits classiques, couples et cadeaux polyvalents",
    chooserNote: "Le format le plus équilibré entre présence au mur, niveau de détail et temps de peinture.",
    featureBullets: [
      "Très bon équilibre entre taille et confort de peinture.",
      "Rendu mural plus marqué qu'un A3.",
      "Excellent choix si vous hésitez entre raisonnable et impressionnant.",
    ],
    tone: "gold",
    badge: {
      label: "Équilibré",
      icon: "star",
    },
    publicVisible: true,
    legacyOnly: false,
    recommended: false,
  },
  stamp_kit_40x50: {
    id: "stamp_kit_40x50",
    processingKey: "40x50",
    shortLabel: "40×50",
    displayLabel: "40 × 50 cm",
    manifestLabel: "40 x 50 cm",
    dimensionsLabel: "40 × 50 cm",
    widthCm: 40,
    heightCm: 50,
    price: 449,
    originalPrice: 549,
    gridCols: 160,
    gridRows: 200,
    colorsLabel: "12-15",
    hoursLabel: "15-30 h",
    difficultyLevel: 3,
    displayDifficultyLabel: "Avancé",
    manifestDifficultyLabel: "Avance",
    headline: "Pièce maîtresse",
    summary: "Le grand format premium pour un rendu plus immersif, plus détaillé et plus spectaculaire une fois terminé.",
    idealFor: "un souvenir fort, un salon ou un cadeau signature",
    chooserNote: "Plus immersif, plus spectaculaire, plus long. À choisir si vous voulez un vrai résultat signature.",
    featureBullets: [
      "Plus d'espace pour les détails et les transitions.",
      "Impact visuel supérieur une fois accroché.",
      "Le format premium si vous cherchez l'effet waouh.",
    ],
    tone: "accent",
    badge: {
      label: "Populaire",
      icon: "star",
    },
    publicVisible: true,
    legacyOnly: false,
    recommended: false,
  },
  stamp_kit_A2: {
    id: "stamp_kit_A2",
    processingKey: "A2",
    shortLabel: "A2",
    displayLabel: "A2 (42 × 59,4 cm)",
    manifestLabel: "A2 (42 x 59,4 cm)",
    dimensionsLabel: "42 × 59,4 cm",
    widthCm: 42,
    heightCm: 59.4,
    price: 399,
    originalPrice: 499,
    gridCols: 168,
    gridRows: 237,
    colorsLabel: "12-15",
    hoursLabel: "20-40 h",
    difficultyLevel: 4,
    displayDifficultyLabel: "Expert",
    manifestDifficultyLabel: "Expert",
    headline: "Format monumental",
    summary: "Le plus grand format disponible, pour une pièce murale ambitieuse qui pousse le niveau de détail et la présence visuelle au maximum.",
    idealFor: "une pièce de salon, un cadeau exceptionnel ou un projet ambitieux",
    chooserNote: "Grand format expert pour un rendu monumental et un projet plus exigeant.",
    featureBullets: [
      "Niveau de détail maximal de la gamme.",
      "Très forte présence murale une fois encadré.",
      "Pensé pour les clients qui veulent un vrai grand projet.",
    ],
    tone: "purple",
    badge: {
      label: "Expert",
      icon: "crown",
    },
    publicVisible: true,
    legacyOnly: false,
    recommended: false,
  },
};

export const DEFAULT_PUBLIC_KIT: KitSize = "stamp_kit_A3";

export const PUBLIC_KIT_ORDER = [
  "stamp_kit_A3",
  "stamp_kit_30x40",
  "stamp_kit_40x50",
  "stamp_kit_A2",
] as const satisfies readonly KitSize[];

export const ALL_KIT_ORDER = [
  "stamp_kit_A4",
  "stamp_kit_A3",
  "stamp_kit_30x40",
  "stamp_kit_40x50",
  "stamp_kit_A2",
] as const satisfies readonly KitSize[];

export const PROCESSING_GRID_CONFIG: Record<ProcessingKitSize, { cols: number; rows: number }> = {
  "40x50": { cols: 160, rows: 200 },
  "30x40": { cols: 120, rows: 160 },
  A4: { cols: 84, rows: 119 },
  A3: { cols: 118, rows: 168 },
  A2: { cols: 168, rows: 237 },
};

export const PROCESSING_KIT_META: Record<
  ProcessingKitSize,
  {
    label: string;
    dimensionsLabel: string;
    aspectRatio: number;
    widthCm: number;
    heightCm: number;
    gridCols: number;
    gridRows: number;
  }
> = Object.values(KIT_CATALOG).reduce(
  (acc, kit) => {
    acc[kit.processingKey] = {
      label: kit.displayLabel,
      dimensionsLabel: kit.dimensionsLabel,
      aspectRatio: kit.widthCm / kit.heightCm,
      widthCm: kit.widthCm,
      heightCm: kit.heightCm,
      gridCols: kit.gridCols,
      gridRows: kit.gridRows,
    };
    return acc;
  },
  {} as Record<
    ProcessingKitSize,
    {
      label: string;
      dimensionsLabel: string;
      aspectRatio: number;
      widthCm: number;
      heightCm: number;
      gridCols: number;
      gridRows: number;
    }
  >,
);

export const KIT_PRICING = Object.fromEntries(
  Object.values(KIT_CATALOG).map((kit) => [kit.id, kit.price]),
) as Record<KitSize, number>;

export const KIT_ORIGINAL_PRICING = Object.fromEntries(
  Object.values(KIT_CATALOG).map((kit) => [kit.id, kit.originalPrice]),
) as Record<KitSize, number>;

export const KIT_LABELS = Object.fromEntries(
  Object.values(KIT_CATALOG).map((kit) => [kit.id, kit.displayLabel]),
) as Record<KitSize, string>;

export function getKitConfig(size: KitSize) {
  return KIT_CATALOG[size];
}

export function getPublicKitConfigs() {
  return PUBLIC_KIT_ORDER.map((size) => KIT_CATALOG[size]);
}

export function isKitSize(value: unknown): value is KitSize {
  return typeof value === "string" && value in KIT_CATALOG;
}

export function isLegacyOnlyKit(size: KitSize | null | undefined) {
  return Boolean(size && KIT_CATALOG[size].legacyOnly);
}

export function isPublicKit(size: KitSize | null | undefined) {
  return Boolean(size && KIT_CATALOG[size].publicVisible);
}

export function resolveProcessingKitSize(size: KitSize | null | undefined) {
  if (size && KIT_CATALOG[size]) {
    return KIT_CATALOG[size].processingKey;
  }

  return KIT_CATALOG[DEFAULT_PUBLIC_KIT].processingKey;
}

export function getKitSavings(size: KitSize) {
  const kit = KIT_CATALOG[size];
  return Math.round((1 - kit.price / kit.originalPrice) * 100);
}

export function getKitDisplayLabel(size: string | null | undefined) {
  if (!size || !isKitSize(size)) return size || "";
  return KIT_CATALOG[size].displayLabel;
}

export function getKitShortLabel(size: string | null | undefined) {
  if (!size || !isKitSize(size)) return size || "";
  return KIT_CATALOG[size].shortLabel;
}

export function getKitComparisonStats(size: KitSize) {
  const kit = KIT_CATALOG[size];
  const paintingStats = getPaintingStats(kit.gridCols, kit.gridRows);

  return {
    totalCells: kit.gridCols * kit.gridRows,
    totalSections: paintingStats.totalSections,
    totalPages: paintingStats.totalPages,
  };
}

export const MAX_KIT_DIFFICULTY = Math.max(
  ...Object.values(KIT_CATALOG).map((kit) => kit.difficultyLevel),
);
