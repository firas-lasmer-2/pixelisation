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
    const { orderRef, instructionCode } = await req.json();
    if (!orderRef || !instructionCode) {
      return json(400, { error: "orderRef and instructionCode are required" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "Supabase service role is not configured" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_ref, instruction_code, status, category, courier_name, tracking_number, fulfillment_note, shipped_at, delivered_at, updated_at")
      .eq("order_ref", String(orderRef).toUpperCase())
      .eq("instruction_code", String(instructionCode).toUpperCase())
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return json(404, { error: "Order not found" });
    }

    const { data: history, error: historyError } = await supabase
      .from("order_status_events")
      .select("status, tracking_number, courier_name, note, source, created_at")
      .eq("order_id", data.id)
      .order("created_at", { ascending: true });

    if (historyError) throw historyError;

    return json(200, {
      orderRef: data.order_ref,
      instructionCode: data.instruction_code,
      status: data.status,
      category: data.category,
      courierName: data.courier_name,
      trackingNumber: data.tracking_number,
      fulfillmentNote: data.fulfillment_note,
      shippedAt: data.shipped_at,
      deliveredAt: data.delivered_at,
      updatedAt: data.updated_at,
      history: history || [],
    });
  } catch (error) {
    console.error("track-order error", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
