export const AI_PROMPT_VERSION = 2;
export const AI_PROMPT_PRESET = "pbn_optimized";
export const AI_QUALITY_MODE = "pbn_optimized";
export const AI_POLL_INTERVAL_MS = 4000;
export const AI_MAX_POLL_ATTEMPTS = 30;
export const AI_PROVIDER_SLOW_ERROR =
  "La generation IA prend plus de temps que prevu. Le fournisseur est lent pour le moment, veuillez reessayer dans un instant.";

type PromptParams = {
  dreamJob?: string | null;
  theme?: string | null;
};

export type GenerationHistoryResponse = {
  status: number;
  generate_result?: string | null;
  generated_image?: Array<{ image_url?: string | null }> | null;
  error_message?: string | null;
};

export type PollGenerationResultInput = {
  fetchHistory: (attempt: number) => Promise<GenerationHistoryResponse>;
  wait?: (delayMs: number) => Promise<void>;
  pollIntervalMs?: number;
  maxAttempts?: number;
};

const PROMPT_SHARED_OPENING = [
  "Create a square 1:1 portrait built for clean paint-by-numbers conversion.",
  "Preserve the identity from the reference photo exactly: eyes, face shape, hairstyle, beard, skin tone, and overall likeness must stay clearly recognizable.",
  "Use a chest-up or waist-up composition with the main subject filling most of the frame and centered.",
  "Use professional portrait lighting, clean readable edges, balanced contrast, and sharp facial detail.",
  "Use only a plain studio backdrop, subtle gradient, or very soft low-detail bokeh background.",
].join(" ");

const PROMPT_SHARED_ENDING = [
  "Keep the design simple, elegant, and easy to read after posterization.",
  "No text, no logos, no watermarks, no crowds, no tiny props, no particles, no heavy effects, no busy scenery, no face obstruction, no extra people, no duplicated limbs.",
].join(" ");

const PROMPT_SCENE_BY_CATEGORY: Record<string, (params: PromptParams) => string> = {
  family: ({ theme }) => {
    const sceneMap: Record<string, string> = {
      "warm-studio": "Create a warm studio family portrait with soft flattering light and a neutral seamless backdrop.",
      outdoor: "Create a natural outdoor portrait look with soft golden-hour light and a very blurred park background.",
      formal: "Create an elegant formal portrait with refined wardrobe styling and a dark soft-focus studio background.",
    };

    return [
      sceneMap[theme || ""] || sceneMap["warm-studio"],
      "If two people are provided, combine them naturally into one image with both faces at the same scale, same depth plane, and equal visual priority.",
      "Keep the emotional tone warm, calm, and premium.",
    ].join(" ");
  },
  kids_dream: ({ dreamJob }) => [
    `Dress the child as a ${dreamJob || "dream profession"} with one large readable prop and wardrobe details that support the role.`,
    "Keep the child's face clearly recognizable and joyful.",
    "Use a clean portrait setup, not an action scene or complex environment.",
  ].join(" "),
  pet: ({ theme }) => {
    const styleMap: Record<string, string> = {
      royal: "Create a refined royal pet portrait with tasteful premium costume styling and a soft dark vignette background.",
      watercolor: "Create a soft watercolor-inspired pet portrait with delicate color transitions and a simple paper-like backdrop.",
      fantasy: "Create a fantasy-inspired pet portrait with one strong costume idea and a restrained low-detail background.",
      modern: "Create a modern graphic-art pet portrait with bold subject shapes and a simple minimal background.",
    };

    return [
      styleMap[theme || ""] || styleMap.royal,
      "Keep the animal's face, fur pattern, and expression highly recognizable.",
      "The face should remain the clear focal point.",
    ].join(" ");
  },
  superhero: ({ theme }) => {
    const heroMap: Record<string, string> = {
      generic: "Create an original heroic super-suit portrait with premium armor details and one strong heroic pose.",
      superman: "Create a blue-and-red heroic super-suit portrait with a confident upright pose.",
      batman: "Create a dark tactical armored-hero portrait with strong sculpted costume shapes.",
      "spider-man": "Create a red-and-blue agile hero portrait with iconic web-inspired suit design.",
      "wonder-woman": "Create an elegant warrior-hero portrait with gold armor accents and a confident pose.",
      "iron-man": "Create a red-and-gold tech-hero portrait with clean armored suit panels and one bright chest detail.",
      captain: "Create a blue tactical hero portrait with a bold patriotic shield-inspired prop.",
      thor: "Create a mythic warrior-hero portrait with premium armor and one powerful hammer prop.",
      "black-panther": "Create a sleek black panther-inspired hero portrait with clean futuristic suit texture.",
    };

    return [
      heroMap[theme || ""] || heroMap.generic,
      "Keep the face fully visible and clearly recognizable.",
      "Do not add lightning storms, city skylines, explosions, or crowded backgrounds.",
    ].join(" ");
  },
  couple: ({ theme }) => {
    const sceneMap: Record<string, string> = {
      romantic: "Create a timeless romantic couple portrait with warm studio light and a soft neutral background.",
      paris: "Create a Paris-inspired couple portrait with elegant wardrobe and only a faint soft-focus ambiance, not a landmark-heavy scene.",
      beach: "Create a beach-inspired couple portrait with warm sunset tones and a very soft simplified background.",
      forest: "Create a forest-inspired couple portrait with gentle natural light and a blurred dreamy backdrop.",
      cafe: "Create a vintage cafe-inspired couple portrait with warm amber light and a minimal bokeh environment.",
      tuscany: "Create a Tuscany-inspired couple portrait with warm countryside tones and a simple atmospheric background.",
    };

    return [
      sceneMap[theme || ""] || sceneMap.romantic,
      "If two people are provided, both faces must be equally sharp, similar in size, and positioned naturally together.",
      "Keep the focus on connection and expression, not scenery.",
    ].join(" ");
  },
  historical: ({ theme }) => {
    const eraMap: Record<string, string> = {
      renaissance: "Create a renaissance-inspired portrait with refined period wardrobe and a plain painterly backdrop.",
      victorian: "Create a Victorian portrait with elegant period clothing and a soft dark studio background.",
      egypt: "Create an ancient Egyptian-inspired portrait with tasteful jewelry and a restrained backdrop, not a full scenic set.",
      "belle-epoque": "Create a Belle Epoque portrait with refined fashion and a softly painted elegant backdrop.",
      rome: "Create an ancient Roman-inspired portrait with dignified costume styling and a minimal classical backdrop.",
    };

    return [
      eraMap[theme || ""] || eraMap.renaissance,
      "Keep the face highly recognizable and the background secondary.",
    ].join(" ");
  },
  scifi: ({ theme }) => {
    const universeMap: Record<string, string> = {
      cyberpunk: "Create a cyberpunk-inspired portrait with futuristic wardrobe, subtle neon edge accents, and a dark simple studio background.",
      space: "Create a space-explorer portrait with clean astronaut styling and a restrained subtle cosmic gradient background.",
      dystopia: "Create a dystopian portrait with rugged futuristic wardrobe and a plain moody background.",
      starwars: "Create a galactic warrior portrait with one clear lightsaber-like prop and a simple atmospheric background.",
    };

    return [
      universeMap[theme || ""] || universeMap.cyberpunk,
      "Avoid complex cityscapes, heavy holograms, or dense environmental detail.",
    ].join(" ");
  },
  anime: ({ theme }) => {
    const styleMap: Record<string, string> = {
      "anime-general": "Create a polished anime portrait with clean cel shading, expressive eyes, and a simple soft background.",
      ghibli: "Create a soft hand-painted anime portrait with warm earthy tones and a very simple gentle backdrop.",
      action: "Create a dynamic shonen-inspired anime portrait with strong pose and restrained speed-line accents only.",
      romance: "Create a romantic shojo-inspired anime portrait with soft pastels and a minimal floral background.",
      chibi: "Create a chibi portrait with oversized expressive features and a plain cute background.",
    };

    return [
      styleMap[theme || ""] || styleMap["anime-general"],
      "Keep the face clearly based on the reference photo while simplifying the design.",
    ].join(" ");
  },
};

export const CATEGORY_STYLES: Record<string, string> = {
  family: "Portrait",
  kids_dream: "Illustration",
  pet: "Portrait Cinematic",
  superhero: "Dynamic",
  couple: "Portrait Fashion",
  historical: "Watercolor",
  scifi: "3D Render",
  anime: "Anime General",
};

export function buildCreativePrompt(category: string, params: PromptParams = {}) {
  const builder = PROMPT_SCENE_BY_CATEGORY[category];
  if (!builder) {
    throw new Error("Invalid category");
  }

  return [PROMPT_SHARED_OPENING, builder(params), PROMPT_SHARED_ENDING].join(" ");
}

export function getCreativeStyle(category: string) {
  return CATEGORY_STYLES[category] || "Photorealistic";
}

export function createAIGenerationMetadata(input: {
  inputCount: number;
  inlineInputCount: number;
  categoryTheme?: string | null;
  pollAttempts?: number;
  elapsedMs?: number;
  providerUuid?: string | null;
  deliveredAs?: "storage_url" | "external_url";
  failed?: boolean;
}) {
  return {
    promptVersion: AI_PROMPT_VERSION,
    promptPreset: AI_PROMPT_PRESET,
    qualityMode: AI_QUALITY_MODE,
    categoryTheme: input.categoryTheme || null,
    inputCount: input.inputCount,
    inlineInputCount: input.inlineInputCount,
    pollAttempts: input.pollAttempts ?? 0,
    elapsedMs: input.elapsedMs ?? 0,
    providerUuid: input.providerUuid || null,
    deliveredAs: input.deliveredAs || null,
    failed: Boolean(input.failed),
  };
}

export function getFriendlyAIGenerationError(message: string) {
  const normalized = message.trim().toLowerCase();
  if (
    normalized === "ai generation timed out" ||
    normalized.includes("timed out") ||
    normalized === AI_PROVIDER_SLOW_ERROR.toLowerCase()
  ) {
    return AI_PROVIDER_SLOW_ERROR;
  }

  return message;
}

export async function pollGenerationResult({
  fetchHistory,
  wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
  pollIntervalMs = AI_POLL_INTERVAL_MS,
  maxAttempts = AI_MAX_POLL_ATTEMPTS,
}: PollGenerationResultInput) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await wait(pollIntervalMs);
    const data = await fetchHistory(attempt);

    if (data.status === 2) {
      const imageUrl = data.generate_result || data.generated_image?.[0]?.image_url;
      if (!imageUrl) {
        throw new Error("No image URL in completed result");
      }

      return {
        imageUrl,
        attempts: attempt,
        elapsedMs: attempt * pollIntervalMs,
      };
    }

    if (data.status === 3) {
      throw new Error(data.error_message || "AI generation failed");
    }
  }

  throw new Error(AI_PROVIDER_SLOW_ERROR);
}
