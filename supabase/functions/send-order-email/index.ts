import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { sendStatusEmail } from "../_shared/mail.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      name,
      orderRef,
      instructionCode,
      status,
      kitSize,
      artStyle,
      totalPrice,
      category,
      trackingUrl,
      trackingNumber,
      courierName,
      fulfillmentNote,
    } = await req.json();

    if (!email || !orderRef || !instructionCode || !status) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await sendStatusEmail({
      email,
      name,
      orderRef,
      instructionCode,
      status,
      kitSize,
      artStyle,
      totalPrice,
      category,
      trackingUrl,
      trackingNumber,
      courierName,
      fulfillmentNote,
    });

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Email send error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
