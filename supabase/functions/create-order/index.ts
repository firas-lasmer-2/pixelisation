import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendStatusEmail } from "../_shared/mail.ts";

const PRICING: Record<string, number> = {
  stamp_kit_40x50: 449,
  stamp_kit_30x40: 349,
  stamp_kit_A4: 249,
};

type CreateOrderPayload = {
  category: string;
  photos: string[];
  aiGeneratedUrl?: string;
  generationRunId?: string;
  selectedStyle: string;
  selectedSize: string;
  contact: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  shipping: {
    address: string;
    city: string;
    governorate: string;
    postalCode: string;
  };
  isGift: boolean;
  giftMessage: string;
  dreamJob?: string;
  couponCode?: string | null;
  sessionId?: string | null;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function createOrderRef() {
  return `HL-${Date.now().toString(36).toUpperCase()}`;
}

function createInstructionCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function dataUrlToBytes(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data");

  const [, mimeType, base64] = match;
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return { bytes, mimeType };
}

async function uploadPhoto(supabase: ReturnType<typeof createClient>, source: string, fileName: string) {
  let bytes: Uint8Array;
  let contentType = "image/png";

  if (source.startsWith("data:")) {
    const parsed = await dataUrlToBytes(source);
    bytes = parsed.bytes;
    contentType = parsed.mimeType;
  } else {
    const response = await fetch(source);
    if (!response.ok) throw new Error("Could not fetch source image");

    const buffer = await response.arrayBuffer();
    bytes = new Uint8Array(buffer);
    contentType = response.headers.get("content-type") || contentType;
  }

  const { error } = await supabase.storage.from("order-photos").upload(fileName, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("order-photos").getPublicUrl(fileName);
  return data.publicUrl;
}

function buildAssetRows(params: {
  orderId: string;
  sourceUrls: string[];
  aiResultUrl: string | null;
  mainUrl: string | null;
  generationRunId?: string;
}) {
  const rows: Array<Record<string, unknown>> = [];

  params.sourceUrls.forEach((url, index) => {
    rows.push({
      order_id: params.orderId,
      asset_kind: "source",
      url,
      label: `Source ${index + 1}`,
      metadata: { index },
    });
  });

  if (params.aiResultUrl) {
    rows.push({
      order_id: params.orderId,
      asset_kind: "ai_result",
      url: params.aiResultUrl,
      label: "AI generated result",
      generation_run_id: params.generationRunId || null,
      metadata: {},
    });
  }

  if (params.mainUrl) {
    rows.push({
      order_id: params.orderId,
      asset_kind: "order_main",
      url: params.mainUrl,
      label: "Selected order image",
      generation_run_id: params.generationRunId || null,
      metadata: {
        fromAi: Boolean(params.aiResultUrl),
      },
    });
  }

  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "Supabase service role is not configured" });
    }

    const payload = (await req.json()) as CreateOrderPayload;
    const sizePrice = PRICING[payload.selectedSize];
    const phone = normalizePhone(payload.contact?.phone || "");

    if (!payload.selectedSize || !payload.selectedStyle || !sizePrice) {
      return json(400, { error: "Missing selected size or style" });
    }

    if (!payload.contact?.firstName || !payload.contact?.lastName || phone.length !== 8) {
      return json(400, { error: "Missing valid contact details" });
    }

    if (!payload.shipping?.address || !payload.shipping?.city || !payload.shipping?.governorate) {
      return json(400, { error: "Missing shipping details" });
    }

    const orderRef = createOrderRef();
    const instructionCode = createInstructionCode();
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase.rpc("create_order_with_coupon", {
      _order_ref: orderRef,
      _instruction_code: instructionCode,
      _kit_size: payload.selectedSize,
      _art_style: payload.selectedStyle,
      _category: payload.category || "classic",
      _dream_job: payload.dreamJob || null,
      _photo_url: null,
      _is_gift: payload.isGift || false,
      _gift_message: payload.giftMessage || "",
      _contact_first_name: payload.contact.firstName.trim(),
      _contact_last_name: payload.contact.lastName.trim(),
      _contact_phone: phone,
      _contact_email: payload.contact.email?.trim() || "",
      _shipping_address: payload.shipping.address.trim(),
      _shipping_city: payload.shipping.city.trim(),
      _shipping_governorate: payload.shipping.governorate.trim(),
      _shipping_postal_code: payload.shipping.postalCode?.trim() || "",
      _coupon_code: payload.couponCode?.trim() || null,
    });

    if (error) {
      const code = error.message || "ORDER_CREATE_FAILED";
      const status = code.startsWith("COUPON_") ? 400 : 500;
      return json(status, { error: code });
    }

    const created = Array.isArray(data) ? data[0] : data;
    const orderId = created.order_id as string;
    const uploadedSourceUrls: string[] = [];

    for (let index = 0; index < payload.photos.length; index++) {
      const source = payload.photos[index];
      if (!source) continue;
      const uploadedUrl = await uploadPhoto(supabase, source, `${orderRef}-source-${index + 1}-${Date.now()}.png`);
      uploadedSourceUrls.push(uploadedUrl);
    }

    let uploadedAiResultUrl: string | null = null;
    if (payload.aiGeneratedUrl) {
      uploadedAiResultUrl = await uploadPhoto(supabase, payload.aiGeneratedUrl, `${orderRef}-ai-${Date.now()}.png`);
    }

    const mainPhotoUrl = uploadedAiResultUrl || uploadedSourceUrls[0] || null;

    if (mainPhotoUrl) {
      await supabase.from("orders").update({ photo_url: mainPhotoUrl }).eq("id", orderId);
    }

    const assetRows = buildAssetRows({
      orderId,
      sourceUrls: uploadedSourceUrls,
      aiResultUrl: uploadedAiResultUrl,
      mainUrl: mainPhotoUrl,
      generationRunId: payload.generationRunId,
    });
    if (assetRows.length > 0) {
      await supabase.from("order_assets").insert(assetRows);
    }

    if (payload.generationRunId) {
      const { data: existingGenerationRun } = await supabase
        .from("ai_generation_runs")
        .select("metadata")
        .eq("id", payload.generationRunId)
        .maybeSingle();

      await supabase
        .from("ai_generation_runs")
        .update({
          order_id: orderId,
          result_image_url: uploadedAiResultUrl || mainPhotoUrl,
          metadata: {
            ...(existingGenerationRun?.metadata && typeof existingGenerationRun.metadata === "object"
              ? existingGenerationRun.metadata
              : {}),
            phase: "order_confirmed",
            orderRef,
          },
        })
        .eq("id", payload.generationRunId);
    }

    if (payload.sessionId) {
      await supabase
        .from("abandoned_carts")
        .update({
          recovered: true,
          recovered_order_ref: orderRef,
        })
        .eq("session_id", payload.sessionId);
    }

    let emailSent = false;

    if (payload.contact.email?.trim()) {
      try {
        await sendStatusEmail({
          email: payload.contact.email.trim(),
          name: payload.contact.firstName.trim(),
          orderRef,
          instructionCode,
          status: "confirmed",
          kitSize: payload.selectedSize,
          artStyle: payload.selectedStyle,
          totalPrice: created.total_price,
          category: payload.category,
        });
        emailSent = true;
      } catch (emailError) {
        console.error("create-order email failed", emailError);
      }
    }

    return json(200, {
      orderRef,
      instructionCode,
      totalPrice: created.total_price,
      discountAmount: created.discount_amount,
      emailSent,
    });
  } catch (error) {
    console.error("create-order error", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
