import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  AI_PROVIDER_SLOW_ERROR,
  buildCreativePrompt,
  createAIGenerationMetadata,
  getCreativeStyle,
  getFriendlyAIGenerationError,
  pollGenerationResult,
} from "../../../src/lib/aiGeneration.ts";

const GEMINIGEN_ENDPOINT = "https://api.geminigen.ai/uapi/v1/generate_image";
const GEMINIGEN_HISTORY_ENDPOINT = "https://api.geminigen.ai/uapi/v1/history";
const MAX_INPUT_BYTES = 10 * 1024 * 1024;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateCategory(category: string, imageCount: number) {
  if (category === "family" && imageCount >= 1 && imageCount <= 2) return;
  if (category === "kids_dream" && imageCount === 1) return;
  if (category === "pet" && imageCount === 1) return;
  if (category === "superhero" && imageCount === 1) return;
  if (category === "couple" && imageCount >= 1 && imageCount <= 2) return;
  if (category === "historical" && imageCount === 1) return;
  if (category === "scifi" && imageCount === 1) return;
  if (category === "anime" && imageCount === 1) return;
  throw new Error("INVALID_INPUT_COMBINATION");
}

function serializeSourceImages(images: string[]) {
  return images.map((image, index) => (
    image.startsWith("http://") || image.startsWith("https://")
      ? image
      : `inline://image-${index + 1}`
  ));
}

async function sourceToBlob(source: string, index: number) {
  if (source.startsWith("data:")) {
    const match = source.match(/^data:(.+);base64,(.+)$/);
    if (!match) throw new Error("INVALID_IMAGE_DATA");

    const [, mimeType, base64] = match;
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    if (bytes.byteLength > MAX_INPUT_BYTES) throw new Error("IMAGE_TOO_LARGE");

    return {
      blob: new Blob([bytes], { type: mimeType }),
      fileName: `input-${index}.${mimeType.includes("png") ? "png" : "jpg"}`,
    };
  }

  const response = await fetch(source);
  if (!response.ok) throw new Error("IMAGE_FETCH_FAILED");

  const contentType = response.headers.get("content-type") || "image/png";
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_INPUT_BYTES) throw new Error("IMAGE_TOO_LARGE");

  return {
    blob: new Blob([bytes], { type: contentType }),
    fileName: `input-${index}.${contentType.includes("png") ? "png" : "jpg"}`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let generationRunId: string | null = null;
  let supabase: ReturnType<typeof createClient> | null = null;
  let inputCount = 0;
  let inlineInputCount = 0;
  let categoryThemeForMetadata: string | null = null;
  let providerUuid: string | null = null;
  let pollAttempts = 0;
  let elapsedMs = 0;

  try {
    const { category, images, dreamJob, categoryTheme, sessionId, orderId, requestedBy } = await req.json();
    if (!category || !Array.isArray(images) || images.length === 0) {
      return json(400, { error: "Missing category or images" });
    }

    inputCount = images.length;
    inlineInputCount = images.filter((image: string) => image.startsWith("data:")).length;
    categoryThemeForMetadata = categoryTheme || null;

    validateCategory(category, images.length);

    const geminiGenKey = Deno.env.get("GEMINIGEN_API_KEY");
    if (!geminiGenKey) {
      return json(500, { error: "AI service not configured" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return json(500, { error: "Supabase service role not configured" });
    }

    try {
      buildCreativePrompt(category, { dreamJob, theme: categoryTheme });
    } catch {
      return json(400, { error: "Invalid category" });
    }

    const model = "nano-banana-2";
    supabase = createClient(supabaseUrl, supabaseKey);

    const { data: generationRun, error: generationRunError } = await supabase
      .from("ai_generation_runs")
      .insert({
        order_id: orderId || null,
        session_id: sessionId || null,
        category,
        dream_job: dreamJob || null,
        provider: "geminigen",
        model,
        requested_by: requestedBy || "studio",
        source_image_urls: serializeSourceImages(images),
        metadata: createAIGenerationMetadata({
          inputCount,
          inlineInputCount,
          categoryTheme: categoryThemeForMetadata,
        }),
      })
      .select("id")
      .single();

    if (generationRunError) {
      console.error("Failed to create ai generation run", generationRunError);
    } else {
      generationRunId = generationRun.id;
    }

    const formData = new FormData();
    formData.append("prompt", buildCreativePrompt(category, { dreamJob, theme: categoryTheme }));
    formData.append("model", model);
    formData.append("aspect_ratio", "1:1");
    formData.append("style", getCreativeStyle(category));
    formData.append("output_format", "jpeg");
    formData.append("resolution", "1K");

    for (let i = 0; i < images.length; i++) {
      const prepared = await sourceToBlob(images[i], i);
      formData.append("files", prepared.blob, prepared.fileName);
    }

    const response = await fetch(GEMINIGEN_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": geminiGenKey,
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 429) {
        if (generationRunId) {
          await supabase
            .from("ai_generation_runs")
            .update({
              error_message: "RATE_LIMITED",
              metadata: createAIGenerationMetadata({
                inputCount,
                inlineInputCount,
                categoryTheme: categoryThemeForMetadata,
                failed: true,
              }),
            })
            .eq("id", generationRunId);
        }
        return json(429, { error: "Service temporarily busy, please try again shortly." });
      }

      const errText = await response.text();
      console.error("GeminiGen image error:", response.status, errText);
      if (generationRunId) {
        await supabase
          .from("ai_generation_runs")
          .update({
            error_message: `${response.status}:${errText.slice(0, 500)}`,
            metadata: createAIGenerationMetadata({
              inputCount,
              inlineInputCount,
              categoryTheme: categoryThemeForMetadata,
              failed: true,
            }),
          })
          .eq("id", generationRunId);
      }
      return json(response.status >= 400 && response.status < 500 ? 400 : 500, {
        error: "AI generation failed",
      });
    }

    const data = await response.json();
    const uuid = data.uuid;
    if (!uuid) {
      return json(500, { error: "No generation UUID returned" });
    }
    providerUuid = uuid;

    // If already completed synchronously, use result directly; otherwise poll
    let externalImageUrl: string;
    if (data.status === 2 && data.generate_result) {
      externalImageUrl = data.generate_result;
    } else {
      const polled = await pollGenerationResult({
        fetchHistory: async () => {
          const res = await fetch(`${GEMINIGEN_HISTORY_ENDPOINT}/${uuid}`, {
            headers: { "x-api-key": geminiGenKey },
          });

          if (!res.ok) throw new Error(`History poll failed: ${res.status}`);
          return await res.json();
        },
      });
      externalImageUrl = polled.imageUrl;
      pollAttempts = polled.attempts;
      elapsedMs = polled.elapsedMs;
    }

    // Download the image server-side and re-upload to Supabase storage
    // so the browser can load it without CORS issues (signed R2 URLs block cross-origin)
    const imgResponse = await fetch(externalImageUrl);
    if (!imgResponse.ok) throw new Error(`Failed to fetch generated image: ${imgResponse.status}`);
    const imgBytes = new Uint8Array(await imgResponse.arrayBuffer());
    const fileName = `ai-${category}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("order-photos")
      .upload(fileName, imgBytes, { contentType: "image/jpeg" });

    let finalImageUrl: string;
    if (uploadError) {
      console.error("Upload to storage failed, returning external URL:", uploadError);
      finalImageUrl = externalImageUrl;
    } else {
      const { data: urlData } = supabase.storage.from("order-photos").getPublicUrl(fileName);
      finalImageUrl = urlData.publicUrl;
    }

    if (generationRunId) {
      await supabase
        .from("ai_generation_runs")
        .update({
          result_image_url: finalImageUrl,
          error_message: null,
          metadata: createAIGenerationMetadata({
            inputCount,
            inlineInputCount,
            categoryTheme: categoryThemeForMetadata,
            pollAttempts,
            elapsedMs,
            providerUuid: uuid,
            deliveredAs: uploadError ? "external_url" : "storage_url",
          }),
        })
        .eq("id", generationRunId);
    }

    return json(200, { imageUrl: finalImageUrl, generationRunId });
  } catch (error) {
    console.error("generate-creative error:", error);
    const message = getFriendlyAIGenerationError(error instanceof Error ? error.message : "Unknown error");
    if (supabase && generationRunId) {
      await supabase
        .from("ai_generation_runs")
        .update({
          error_message: message,
          metadata: createAIGenerationMetadata({
            inputCount,
            inlineInputCount,
            categoryTheme: categoryThemeForMetadata,
            pollAttempts,
            elapsedMs,
            providerUuid,
            failed: true,
          }),
        })
        .eq("id", generationRunId);
    }
    if (message === "INVALID_INPUT_COMBINATION") {
      return json(400, { error: "Invalid category/image combination" });
    }
    if (message === "IMAGE_TOO_LARGE") {
      return json(413, { error: "One of the images is too large" });
    }
    if (message === AI_PROVIDER_SLOW_ERROR) {
      return json(504, { error: message });
    }
    return json(500, { error: message });
  }
});
