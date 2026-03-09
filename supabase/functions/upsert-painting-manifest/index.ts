import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeDedicationText(value: unknown) {
  if (typeof value !== "string") return null;

  const normalized = value
    .normalize("NFKC")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 22);

  return normalized || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderRef, instructionCode, manifest } = await req.json();
    if (!orderRef || !instructionCode || !manifest) {
      return json(400, { error: "orderRef, instructionCode and manifest are required" });
    }

    if (!Array.isArray(manifest.indices) || !manifest.gridCols || !manifest.gridRows) {
      return json(400, { error: "Manifest is missing the required grid payload" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "Supabase service role is not configured" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_ref, instruction_code, photo_url")
      .eq("order_ref", String(orderRef).toUpperCase())
      .eq("instruction_code", String(instructionCode).toUpperCase())
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return json(404, { error: "Order not found" });
    }

    const resolvedDedicationText =
      sanitizeDedicationText(manifest?.dedication?.text) ||
      sanitizeDedicationText(manifest?.dedicationText) ||
      null;

    const resolvedManifest = {
      ...manifest,
      version: 4,
      orderRef: order.order_ref,
      instructionCode: order.instruction_code,
      dedicationText: resolvedDedicationText,
      dedication:
        resolvedDedicationText && manifest?.dedication
          ? {
              ...manifest.dedication,
              text: resolvedDedicationText,
            }
          : null,
      sourceImageUrl:
        typeof manifest.sourceImageUrl === "string" && !manifest.sourceImageUrl.startsWith("data:")
          ? manifest.sourceImageUrl
          : order.photo_url,
    };

    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({
        dedication_text: resolvedDedicationText,
      })
      .eq("id", order.id);

    if (orderUpdateError) throw orderUpdateError;

    const { error: upsertError } = await supabase
      .from("painting_manifests")
      .upsert({
        order_id: order.id,
        order_ref: order.order_ref,
        instruction_code: order.instruction_code,
        manifest: resolvedManifest,
      }, { onConflict: "instruction_code" });

    if (upsertError) throw upsertError;

    return json(200, {
      success: true,
      instructionCode: order.instruction_code,
      manifest: resolvedManifest,
    });
  } catch (error) {
    console.error("upsert-painting-manifest error", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

