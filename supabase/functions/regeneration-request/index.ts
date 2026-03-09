import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_REQUESTS_PER_DAY = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_ref, reason } = await req.json();

    if (!order_ref || !reason || reason.trim().length < 5) {
      return new Response(JSON.stringify({ error: "order_ref and reason (min 5 chars) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get client IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || "unknown";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate order exists
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_ref, photo_url, category")
      .eq("order_ref", order_ref.toUpperCase())
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check IP rate limit — max 3 per 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("regeneration_requests")
      .select("*", { count: "exact", head: true })
      .eq("client_ip", clientIp)
      .gte("created_at", since);

    if (countError) throw countError;

    const remaining = MAX_REQUESTS_PER_DAY - (count || 0);

    if (remaining <= 0) {
      return new Response(JSON.stringify({
        error: "Rate limit exceeded. Maximum 3 requests per 24 hours.",
        remaining: 0,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if there's already a pending request for this order
    const { data: existing } = await supabase
      .from("regeneration_requests")
      .select("id")
      .eq("order_id", order.id)
      .in("status", ["pending", "in_progress"])
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({
        error: "A regeneration request is already pending for this order.",
        remaining: remaining,
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert request
    const { error: insertError } = await supabase
      .from("regeneration_requests")
      .insert({
        order_id: order.id,
        order_ref: order.order_ref,
        reason: reason.trim().slice(0, 500),
        original_photo_url: order.photo_url,
        client_ip: clientIp,
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      success: true,
      remaining: remaining - 1,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("regeneration-request error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
