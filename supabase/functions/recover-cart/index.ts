import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return json(400, { error: "sessionId is required" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "Supabase service role is not configured" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: cart, error } = await supabase
      .from("abandoned_carts")
      .select("*")
      .eq("session_id", String(sessionId))
      .maybeSingle();

    if (error) throw error;
    if (!cart) {
      return json(404, { error: "Cart not found" });
    }

    return json(200, {
      sessionId: cart.session_id,
      alreadyRecovered: cart.recovered,
      recoveredOrderRef: cart.recovered_order_ref,
      cart: {
        category: cart.category,
        productType: (cart as Record<string, unknown>).product_type || "paint_by_numbers",
        selectedSize: cart.kit_size,
        selectedStyle: cart.art_style,
        stencilDetailLevel: (cart as Record<string, unknown>).stencil_detail_level || null,
        glitterPalette: (cart as Record<string, unknown>).glitter_palette || null,
        cropData: (cart as Record<string, unknown>).crop_data || null,
        dedicationText: cart.dedication_text,
        dreamJob: cart.dream_job,
        stepReached: cart.step_reached,
        photoUploaded: cart.photo_uploaded,
        contact: {
          firstName: cart.contact_first_name,
          email: cart.contact_email,
          phone: cart.contact_phone,
        },
      },
    });
  } catch (error) {
    console.error("recover-cart error", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
