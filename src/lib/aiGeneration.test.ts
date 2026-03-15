import {
  AI_MAX_POLL_ATTEMPTS,
  AI_POLL_INTERVAL_MS,
  AI_PROMPT_PRESET,
  AI_PROMPT_VERSION,
  AI_PROVIDER_SLOW_ERROR,
  buildCreativePrompt,
  createAIGenerationMetadata,
  getFriendlyAIGenerationError,
  pollGenerationResult,
} from "@/lib/aiGeneration";

describe("aiGeneration", () => {
  it("builds PBN-optimized prompts with restrained backgrounds", () => {
    const superheroPrompt = buildCreativePrompt("superhero", { theme: "thor" });
    const couplePrompt = buildCreativePrompt("couple", { theme: "paris" });

    expect(superheroPrompt).toContain("clean paint-by-numbers conversion");
    expect(superheroPrompt).toContain("plain studio backdrop");
    expect(superheroPrompt).toContain("No text, no logos");
    expect(superheroPrompt).not.toContain("dramatic lightning in background");
    expect(superheroPrompt).not.toContain("city skyline in the background");

    expect(couplePrompt).toContain("similar in size");
    expect(couplePrompt).toContain("not a landmark-heavy scene");
    expect(couplePrompt).not.toContain("Eiffel Tower visible");
  });

  it("returns metadata with prompt and quality tracking fields", () => {
    expect(createAIGenerationMetadata({
      inputCount: 2,
      inlineInputCount: 1,
      categoryTheme: "paris",
      pollAttempts: 7,
      elapsedMs: 28000,
      providerUuid: "uuid-123",
      deliveredAs: "storage_url",
    })).toEqual({
      promptVersion: AI_PROMPT_VERSION,
      promptPreset: AI_PROMPT_PRESET,
      qualityMode: "pbn_optimized",
      categoryTheme: "paris",
      inputCount: 2,
      inlineInputCount: 1,
      pollAttempts: 7,
      elapsedMs: 28000,
      providerUuid: "uuid-123",
      deliveredAs: "storage_url",
      failed: false,
    });
  });

  it("succeeds when the provider completes on the final allowed attempt", async () => {
    const fetchHistory = vi.fn(async (attempt: number) => (
      attempt === AI_MAX_POLL_ATTEMPTS
        ? { status: 2, generate_result: "https://example.com/final.jpg" }
        : { status: 1 }
    ));

    const result = await pollGenerationResult({
      fetchHistory,
      wait: vi.fn(async () => undefined),
    });

    expect(result).toEqual({
      imageUrl: "https://example.com/final.jpg",
      attempts: AI_MAX_POLL_ATTEMPTS,
      elapsedMs: AI_MAX_POLL_ATTEMPTS * AI_POLL_INTERVAL_MS,
    });
    expect(fetchHistory).toHaveBeenCalledTimes(AI_MAX_POLL_ATTEMPTS);
  });

  it("maps generation timeouts to the friendly provider-slow message", async () => {
    await expect(pollGenerationResult({
      fetchHistory: vi.fn(async () => ({ status: 1 })),
      wait: vi.fn(async () => undefined),
    })).rejects.toThrow(AI_PROVIDER_SLOW_ERROR);

    expect(getFriendlyAIGenerationError("AI generation timed out")).toBe(AI_PROVIDER_SLOW_ERROR);
  });
});
