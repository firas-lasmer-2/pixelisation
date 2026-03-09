import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendRecoveryEmail } from "../_shared/mail.ts";

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

    if (cart.recovered && cart.recovered_order_ref) {
      return json(409, {
        error: "Cart already recovered",
        recoveredOrderRef: cart.recovered_order_ref,
      });
    }

    if (!cart.contact_email) {
      return json(400, { error: "Cart has no email address" });
    }

    try {
      await sendRecoveryEmail({
        email: cart.contact_email,
        name: cart.contact_first_name,
        sessionId: cart.session_id,
        stepReached: cart.step_reached,
        category: cart.category,
        kitSize: cart.kit_size,
        dreamJob: cart.dream_job,
      });
    } catch (mailError) {
      await supabase
        .from("abandoned_carts")
        .update({
          last_recovery_sent_at: new Date().toISOString(),
          last_recovery_status: "failed",
          recovery_channel: "email",
          recovery_attempts: (cart.recovery_attempts || 0) + 1,
        })
        .eq("id", cart.id);
      throw mailError;
    }

    await supabase
      .from("abandoned_carts")
      .update({
        last_recovery_sent_at: new Date().toISOString(),
        recovery_attempts: (cart.recovery_attempts || 0) + 1,
        recovery_channel: "email",
        last_recovery_status: "sent",
      })
      .eq("id", cart.id);

    return json(200, {
      success: true,
      email: cart.contact_email,
    });
  } catch (error) {
    console.error("send-cart-recovery error", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
