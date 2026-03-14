import { getPaintingStats } from "@/lib/paintingLayout";

export const KIT_IDS = [
  "stamp_kit_40x50",
  "stamp_kit_30x40",
  "stamp_kit_40x60",
  "stamp_kit_A4",
  "stamp_kit_A3",
  "stamp_kit_A2",
] as const;

export type KitSize = (typeof KIT_IDS)[number];

export const PROCESSING_KIT_IDS = ["40x50", "30x40", "40x60", "A4", "A3", "A2"] as const;
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
    headline: "Format legacy compact",
    summary: "Ancien petit format Helma. Il reste compatible pour les commandes déjà créées, mais n'est plus proposé dans la nouvelle gamme toile.",
    idealFor: "une ancienne commande à relancer",
    chooserNote: "Conservé uniquement pour la compatibilité legacy.",
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
    colorsLabel: "10",
    hoursLabel: "8-20 h",
    difficultyLevel: 2,
    displayDifficultyLabel: "Intermédiaire",
    manifestDifficultyLabel: "Intermediaire",
    headline: "Format legacy intermédiaire",
    summary: "Ancien format moyen Helma, conservé pour les commandes créées avant la nouvelle gamme 30 × 40 / 40 × 50 / 40 × 60.",
    idealFor: "une commande restaurée ou un ancien panier",
    chooserNote: "Format legacy conservé uniquement pour compatibilité.",
    featureBullets: [
      "Reste compatible avec les anciens paniers et liens de viewer.",
      "Toujours généré correctement dans le PDF et le viewer.",
      "Retiré de la sélection publique au profit des formats toile standard.",
    ],
    tone: "gold",
    badge: {
      label: "Legacy",
      icon: "sparkles",
    },
    publicVisible: false,
    legacyOnly: true,
    recommended: false,
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
    colorsLabel: "10-12",
    hoursLabel: "8-18 h",
    difficultyLevel: 2,
    displayDifficultyLabel: "Intermédiaire",
    manifestDifficultyLabel: "Intermediaire",
    headline: "Le nouveau point de départ",
    summary: "Le format d'entrée recommandé pour Helma. Suffisamment détaillé pour un beau portrait, mais encore très confortable à peindre et à offrir.",
    idealFor: "une première commande, un cadeau ou un portrait solo équilibré",
    chooserNote: "Le meilleur point de départ pour lancer la nouvelle gamme toile avec un vrai niveau de détail.",
    featureBullets: [
      "Format toile standard facile à produire et à encadrer.",
      "Assez détaillé pour un rendu propre sans allonger excessivement le temps de peinture.",
      "Le meilleur choix pour une première commande Helma en Tunisie.",
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
    hoursLabel: "14-28 h",
    difficultyLevel: 3,
    displayDifficultyLabel: "Avancé",
    manifestDifficultyLabel: "Avance",
    headline: "Le meilleur équilibre",
    summary: "Notre format signature pour la plupart des clients. Plus de présence murale et plus de finesse, sans devenir un projet trop long ou trop exigeant.",
    idealFor: "les couples, portraits forts et cadeaux premium polyvalents",
    chooserNote: "Le meilleur équilibre entre impact visuel, niveau de détail et confort de production.",
    featureBullets: [
      "Format le plus convaincant pour la majorité des commandes premium.",
      "Plus d'espace pour les détails du visage, des vêtements et du fond.",
      "Le format à pousser si vous voulez un rendu plus impressionnant au mur.",
    ],
    tone: "emerald",
    badge: {
      label: "Populaire",
      icon: "star",
    },
    publicVisible: true,
    legacyOnly: false,
    recommended: false,
  },
  stamp_kit_40x60: {
    id: "stamp_kit_40x60",
    processingKey: "40x60",
    shortLabel: "40×60",
    displayLabel: "40 × 60 cm",
    manifestLabel: "40 x 60 cm",
    dimensionsLabel: "40 × 60 cm",
    widthCm: 40,
    heightCm: 60,
    price: 499,
    originalPrice: 629,
    gridCols: 160,
    gridRows: 240,
    colorsLabel: "12-16",
    hoursLabel: "18-36 h",
    difficultyLevel: 4,
    displayDifficultyLabel: "Expert",
    manifestDifficultyLabel: "Expert",
    headline: "Le grand format signature",
    summary: "Le grand format pour une vraie pièce murale. Plus immersif, plus détaillé et plus valorisant une fois terminé, avec un rendu premium pour les salons et grands cadeaux.",
    idealFor: "une pièce de salon, un cadeau marquant ou une commande haut de gamme",
    chooserNote: "Le grand format à choisir si vous voulez une présence murale forte et un résultat plus spectaculaire.",
    featureBullets: [
      "Grand format portrait cohérent avec la production toile locale.",
      "Niveau de détail élevé grâce à une grille 160 × 240 plus ambitieuse.",
      "Le meilleur choix pour une version premium clairement différenciée.",
    ],
    tone: "accent",
    badge: {
      label: "Grand format",
      icon: "crown",
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
    colorsLabel: "12",
    hoursLabel: "20-40 h",
    difficultyLevel: 4,
    displayDifficultyLabel: "Expert",
    manifestDifficultyLabel: "Expert",
    headline: "Format legacy monumental",
    summary: "Ancien très grand format Helma, conservé pour les anciennes commandes et les manifests déjà générés avant le passage au 40 × 60.",
    idealFor: "une ancienne commande premium à finaliser",
    chooserNote: "Format legacy conservé uniquement pour compatibilité des anciennes commandes.",
    featureBullets: [
      "Toujours compatible avec les manifests et liens déjà envoyés.",
      "Reste lisible dans le viewer et le PDF pour les anciennes commandes.",
      "Remplacé dans la gamme publique par le 40 × 60 plus cohérent à produire.",
    ],
    tone: "purple",
    badge: {
      label: "Legacy",
      icon: "crown",
    },
    publicVisible: false,
    legacyOnly: true,
    recommended: false,
  },
};

export const DEFAULT_PUBLIC_KIT: KitSize = "stamp_kit_30x40";

export const PUBLIC_KIT_ORDER = [
  "stamp_kit_30x40",
  "stamp_kit_40x50",
  "stamp_kit_40x60",
] as const satisfies readonly KitSize[];

export const ALL_KIT_ORDER = [
  "stamp_kit_A4",
  "stamp_kit_A3",
  "stamp_kit_30x40",
  "stamp_kit_40x50",
  "stamp_kit_40x60",
  "stamp_kit_A2",
] as const satisfies readonly KitSize[];

export const PROCESSING_GRID_CONFIG: Record<ProcessingKitSize, { cols: number; rows: number }> = {
  "40x50": { cols: 200, rows: 250 },
  "30x40": { cols: 150, rows: 200 },
  "40x60": { cols: 200, rows: 300 },
  A4: { cols: 105, rows: 149 },
  A3: { cols: 149, rows: 210 },
  A2: { cols: 210, rows: 297 },
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