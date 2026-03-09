import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/images/edits";
const MAX_INPUT_BYTES = 10 * 1024 * 1024;

const PROMPTS: Record<string, (params: { dreamJob?: string | null }) => string> = {
  family: () =>
    "Create a warm, photorealistic portrait from the supplied family imagery. If multiple people are provided, combine them naturally into one emotionally rich paint-by-numbers composition. If only one reference image is supplied, preserve the same scene and produce a polished, print-ready variation.",
  kids_dream: (params) =>
    `Create a joyful illustration of the supplied child as a ${params.dreamJob || "superhero"}. Keep the child recognizable, add matching outfit and props, and make the final image vibrant, optimistic, and suitable for a premium paint-by-numbers kit.`,
  pet: () =>
    "Transform the supplied pet into a majestic renaissance-style royal portrait. Keep the pet recognizable, add regal clothing and dramatic classical framing, and make the final composition suitable for a premium paint-by-numbers kit.",
};

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

  try {
    const { category, images, dreamJob, sessionId, orderId, requestedBy } = await req.json();
    if (!category || !Array.isArray(images) || images.length === 0) {
      return json(400, { error: "Missing category or images" });
    }

    inputCount = images.length;
    inlineInputCount = images.filter((image: string) => image.startsWith("data:")).length;

    validateCategory(category, images.length);

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      return json(500, { error: "AI service not configured" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return json(500, { error: "Supabase service role not configured" });
    }

    const promptFn = PROMPTS[category];
    if (!promptFn) {
      return json(400, { error: "Invalid category" });
    }

    const model = Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-1";
    supabase = createClient(supabaseUrl, supabaseKey);

    const { data: generationRun, error: generationRunError } = await supabase
      .from("ai_generation_runs")
      .insert({
        order_id: orderId || null,
        session_id: sessionId || null,
        category,
        dream_job: dreamJob || null,
        provider: "openai",
        model,
        requested_by: requestedBy || "studio",
        source_image_urls: serializeSourceImages(images),
        metadata: {
          inputCount,
          inlineInputCount,
        },
      })
      .select("id")
      .single();

    if (generationRunError) {
      console.error("Failed to create ai generation run", generationRunError);
    } else {
      generationRunId = generationRun.id;
    }

    const formData = new FormData();
    formData.append("model", model);
    formData.append("prompt", promptFn({ dreamJob }));
    formData.append("size", "1024x1024");

    for (let i = 0; i < images.length; i++) {
      const prepared = await sourceToBlob(images[i], i);
      formData.append("image[]", prepared.blob, prepared.fileName);
    }

    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 429) {
        if (generationRunId) {
          await supabase
            .from("ai_generation_runs")
            .update({ error_message: "RATE_LIMITED" })
            .eq("id", generationRunId);
        }
        return json(429, { error: "Service temporarily busy, please try again shortly." });
      }

      const errText = await response.text();
      console.error("OpenAI image error:", response.status, errText);
      if (generationRunId) {
        await supabase
          .from("ai_generation_runs")
          .update({ error_message: `${response.status}:${errText.slice(0, 500)}` })
          .eq("id", generationRunId);
      }
      return json(response.status >= 400 && response.status < 500 ? 400 : 500, {
        error: "AI generation failed",
      });
    }

    const data = await response.json();
    const generatedImage =
      data?.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : data?.data?.[0]?.url;

    if (!generatedImage) {
      return json(500, { error: "No image generated" });
    }

    if (!generatedImage.startsWith("data:")) {
      if (generationRunId) {
        await supabase
          .from("ai_generation_runs")
          .update({
            result_image_url: generatedImage,
            error_message: null,
            metadata: {
              inputCount,
              inlineInputCount,
              deliveredAs: "remote_url",
            },
          })
          .eq("id", generationRunId);
      }

      return json(200, { imageUrl: generatedImage, generationRunId });
    }

    const base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `ai-${category}-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("order-photos")
      .upload(fileName, binaryData, { contentType: "image/png" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      if (generationRunId) {
        await supabase
          .from("ai_generation_runs")
          .update({
            result_image_url: generatedImage,
            error_message: null,
            metadata: {
              inputCount,
              inlineInputCount,
              deliveredAs: "data_url",
              uploadError: uploadError.message,
            },
          })
          .eq("id", generationRunId);
      }

      return json(200, { imageUrl: generatedImage, generationRunId });
    }

    const { data: urlData } = supabase.storage.from("order-photos").getPublicUrl(fileName);
    const finalImageUrl = urlData.publicUrl;

    if (generationRunId) {
      await supabase
        .from("ai_generation_runs")
        .update({
          result_image_url: finalImageUrl,
          error_message: null,
          metadata: {
            inputCount,
            inlineInputCount,
            deliveredAs: "storage_url",
          },
        })
        .eq("id", generationRunId);
    }

    return json(200, { imageUrl: finalImageUrl, generationRunId });
  } catch (error) {
    console.error("generate-creative error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    if (supabase && generationRunId) {
      await supabase
        .from("ai_generation_runs")
        .update({
          error_message: message,
          metadata: {
            inputCount,
            inlineInputCount,
            failed: true,
          },
        })
        .eq("id", generationRunId);
    }
    if (message === "INVALID_INPUT_COMBINATION") {
      return json(400, { error: "Invalid category/image combination" });
    }
    if (message === "IMAGE_TOO_LARGE") {
      return json(413, { error: "One of the images is too large" });
    }
    return json(500, { error: message });
  }
});
