import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINIGEN_ENDPOINT = "https://api.geminigen.ai/uapi/v1/generate_image";
const GEMINIGEN_HISTORY_ENDPOINT = "https://api.geminigen.ai/uapi/v1/history";
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

const PROMPTS: Record<string, (params: { dreamJob?: string | null; theme?: string | null }) => string> = {
  family: ({ theme }) => {
    const sceneMap: Record<string, string> = {
      outdoor: "Golden hour outdoor portrait: natural park setting with dappled sunlight.",
      formal:  "Elegant formal portrait: dark professional background, studio lighting.",
    };
    const scene = (theme && sceneMap[theme]) || "warm studio lighting, clean neutral background";
    return `High quality photorealistic portrait of the people in the reference photos. ${scene}. If two people are provided, naturally combine them into a single warm, emotionally rich scene. Sharp facial details, professional quality. No text, no watermarks.`;
  },
  kids_dream: ({ dreamJob }) =>
    `High quality portrait of the child dressed as a ${dreamJob || "superhero"}. Keep the child's face clearly recognizable. Vibrant colors, matching costume and props, natural confident pose. Clean simple background, professional studio lighting, sharp details. No text, no watermarks.`,
  pet: ({ theme }) => {
    const styleMap: Record<string, string> = {
      watercolor: "Gentle watercolor painting: soft colors, paper texture, expressive eyes and fur.",
      fantasy:    "Epic fantasy: the pet as a medieval knight or wizard with glowing magical aura.",
      modern:     "Modern stylized graphic art: bold colors, clean geometric shapes, contemporary illustration.",
    };
    const style = (theme && styleMap[theme]) || "majestic classical oil painting with rich jewel-tone colors and dramatic Rembrandt lighting";
    return `Portrait of the pet in the photo. Style: ${style}. The animal's face and fur textures are rendered in fine detail. Dark neutral background with soft vignette. No text, no watermarks.`;
  },
  superhero: ({ theme }) => {
    const heroMap: Record<string, string> = {
      superman:       "Superman-inspired blue suit and red cape, city skyline in the background",
      batman:         "Batman-inspired dark armored suit and cowl, gothic Gotham city atmosphere",
      "spider-man":   "Spider-Man inspired red and blue suit, city rooftop background with webs",
      "wonder-woman": "Wonder Woman inspired golden armor and tiara, warrior goddess heroic pose",
      "iron-man":     "Iron Man inspired red and gold high-tech armored suit with glowing arc reactor",
      captain:        "Captain America inspired blue uniform with the iconic vibranium shield",
      thor:           "Thor inspired Norse warrior attire with Mjolnir hammer, dramatic lightning in background",
      "black-panther":"Black Panther inspired sleek vibranium suit, Wakandan golden city background",
    };
    const heroDesc = (theme && heroMap[theme]) || "a custom epic super-suit";
    return `Epic cinematic superhero portrait of the person in the photo wearing ${heroDesc}. Keep facial features clearly recognizable. Dynamic powerful pose, dramatic hero lighting with strong contrast. No text, no logos, no watermarks.`;
  },
  couple: ({ theme }) => {
    const sceneMap: Record<string, string> = {
      paris:   "with the Eiffel Tower visible in the soft-focus background at golden hour",
      beach:   "on a tropical beach at sunset, warm golden light, calm ocean behind them",
      forest:  "in an enchanted forest, dappled sunlight through the trees, fairy-tale atmosphere",
      cafe:    "inside a cozy vintage Parisian café, warm amber lighting, bokeh background",
      tuscany: "in the rolling golden hills of Tuscany, Italian countryside backdrop at sunset",
    };
    const scene = (theme && sceneMap[theme]) || "with soft warm romantic studio lighting";
    return `Beautiful romantic portrait of the couple from the reference photos ${scene}. Both people look natural and connected. Shallow depth of field, sharp faces, professional photography quality. No text, no watermarks.`;
  },
  historical: ({ theme }) => {
    const eraMap: Record<string, string> = {
      victorian:     "Victorian England: elegant aristocratic clothing, rich dark wood interior, classical portrait style.",
      egypt:         "Ancient Egyptian pharaonic portrait: gold jewelry and headdress, hieroglyphs and pyramids in background.",
      "belle-epoque":"Belle Époque Paris 1900: elegant high-fashion, ornate interior with warm candlelight.",
      rome:          "Ancient Roman portrait: toga and laurel wreath, marble columns and forum in background.",
    };
    const era = (theme && eraMap[theme]) || "Classical Renaissance: elegant period-appropriate attire with fine fabric detail.";
    return `Historical oil painting portrait of the person in the photo. Setting: ${era}. Dramatic Rembrandt lighting, deep warm tones. Face clearly recognizable with fine detail. No text, no watermarks.`;
  },
  scifi: ({ theme }) => {
    const universeMap: Record<string, string> = {
      space:    "NASA-style space explorer suit, stars and nebulae in background, astronaut helmet visor.",
      dystopia: "Post-apocalyptic wasteland warrior in rugged salvaged armor, ruined city background, dust haze.",
      starwars: "Star Wars inspired Jedi with a glowing lightsaber, galactic space background.",
    };
    const universe = (theme && universeMap[theme]) || "Cyberpunk 2077: futuristic high-tech outfit, dramatic neon accent lighting, dark atmospheric city.";
    return `Cinematic sci-fi portrait of the person in the photo. Setting: ${universe}. Face clearly recognizable, sharp detail, vivid color. No text, no watermarks.`;
  },
  anime: ({ theme }) => {
    const styleMap: Record<string, string> = {
      ghibli:  "Studio Ghibli inspired: soft watercolor-like style, warm earthy tones, lush nature background.",
      action:  "Dynamic shonen action anime: intense determined expression, power aura effects, dramatic speed lines.",
      romance: "Romantic shojo manga style: soft pastel colors, sparkle effects, floral background.",
      chibi:   "Super-deformed chibi style: oversized head, tiny body, huge expressive eyes, kawaii aesthetic.",
    };
    const style = (theme && styleMap[theme]) || "polished cel-shaded anime illustration: vibrant saturated colors, expressive eyes, clean smooth linework.";
    return `High quality Japanese anime illustration of the person in the photo. Style: ${style}. Face recognizable and detailed. No text, no watermarks.`;
  },
};

const CATEGORY_STYLES: Record<string, string> = {
  family:     "Portrait",
  kids_dream: "Illustration",
  pet:        "Portrait Cinematic",
  superhero:  "Dynamic",
  couple:     "Portrait Fashion",
  historical: "Watercolor",
  scifi:      "3D Render",
  anime:      "Anime General",
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

async function pollForResult(uuid: string, apiKey: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const res = await fetch(`${GEMINIGEN_HISTORY_ENDPOINT}/${uuid}`, {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) throw new Error(`History poll failed: ${res.status}`);

    const data = await res.json();

    if (data.status === 2) {
      const url = data.generate_result || data.generated_image?.[0]?.image_url;
      if (!url) throw new Error("No image URL in completed result");
      return url;
    }

    if (data.status === 3) {
      throw new Error(data.error_message || "AI generation failed");
    }
  }

  throw new Error("AI generation timed out");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let generationRunId: string | null = null;
  let supabase: ReturnType<typeof createClient> | null = null;
  let inputCount = 0;
  let inlineInputCount = 0;

  try {
    const { category, images, dreamJob, categoryTheme, sessionId, orderId, requestedBy } = await req.json();
    if (!category || !Array.isArray(images) || images.length === 0) {
      return json(400, { error: "Missing category or images" });
    }

    inputCount = images.length;
    inlineInputCount = images.filter((image: string) => image.startsWith("data:")).length;

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

    const promptFn = PROMPTS[category];
    if (!promptFn) {
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
    formData.append("prompt", promptFn({ dreamJob, theme: categoryTheme }));
    formData.append("model", model);
    formData.append("aspect_ratio", "1:1");
    formData.append("style", CATEGORY_STYLES[category] || "Photorealistic");
    formData.append("output_format", "jpeg");
    formData.append("resolution", "2K");

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
            .update({ error_message: "RATE_LIMITED" })
            .eq("id", generationRunId);
        }
        return json(429, { error: "Service temporarily busy, please try again shortly." });
      }

      const errText = await response.text();
      console.error("GeminiGen image error:", response.status, errText);
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
    const uuid = data.uuid;
    if (!uuid) {
      return json(500, { error: "No generation UUID returned" });
    }

    // If already completed synchronously, use result directly; otherwise poll
    let externalImageUrl: string;
    if (data.status === 2 && data.generate_result) {
      externalImageUrl = data.generate_result;
    } else {
      externalImageUrl = await pollForResult(uuid, geminiGenKey);
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
          metadata: {
            inputCount,
            inlineInputCount,
            deliveredAs: uploadError ? "external_url" : "storage_url",
            externalUuid: uuid,
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
