import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, (params: any) => string> = {
  family: (p: any) => `Create a warm, photorealistic painting-style portrait of two people together in a loving scene. Composite these two people naturally into one image — they could be hugging, standing side by side, or in a tender family moment. The style should be warm and suitable for a paint-by-numbers canvas. Make it look natural and emotional.`,
  kids_dream: (p: any) => `Create a fun, colorful illustration showing a child as a ${p.dreamJob || "superhero"}. Place the child naturally in a scene that matches the profession — wearing appropriate outfit and surrounded by relevant props. The style should be vibrant, joyful, and suitable for a paint-by-numbers canvas. Make it look like a children's dream come true.`,
  pet: (p: any) => `Transform this pet photo into a majestic royal renaissance portrait. The pet should be wearing regal clothing — a royal robe, crown, or military uniform from the 17th-18th century. The background should be a classic oil painting style with rich, dark tones. Make it look like a formal royal portrait that would hang in a palace. The style should be suitable for a paint-by-numbers canvas.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, images, dreamJob } = await req.json();

    if (!category || !images || images.length === 0) {
      return new Response(JSON.stringify({ error: "Missing category or images" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const promptFn = PROMPTS[category];
    if (!promptFn) {
      return new Response(JSON.stringify({ error: "Invalid category" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = promptFn({ dreamJob });

    // Build message content with images
    const content: any[] = [{ type: "text", text: prompt }];
    for (const img of images) {
      content.push({
        type: "image_url",
        image_url: { url: img },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Service temporarily busy, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Service credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      return new Response(JSON.stringify({ error: "No image generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const fileName = `ai-${category}-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("order-photos")
      .upload(fileName, binaryData, { contentType: "image/png" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Fall back to returning base64 directly
      return new Response(JSON.stringify({ imageUrl: generatedImage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage.from("order-photos").getPublicUrl(fileName);

    return new Response(JSON.stringify({ imageUrl: urlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-creative error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
