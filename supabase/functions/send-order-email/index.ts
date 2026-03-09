import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS_CONFIG: Record<string, { subject: string; heading: string; body: string; emoji: string; color: string }> = {
  confirmed: {
    subject: "🎨 Commande confirmée — Flink Atelier",
    heading: "Commande confirmée !",
    body: "Votre commande a été reçue et confirmée. Nous allons commencer à préparer votre kit de peinture par numéros personnalisé.",
    emoji: "✅",
    color: "#C4963C",
  },
  processing: {
    subject: "🖌️ Votre kit est en préparation — Flink Atelier",
    heading: "Kit en cours de préparation",
    body: "Votre kit de peinture par numéros est en cours de préparation. Notre équipe crée avec soin chaque élément de votre kit personnalisé.",
    emoji: "🖌️",
    color: "#2563EB",
  },
  shipped: {
    subject: "📦 Votre commande est expédiée — Flink Atelier",
    heading: "Commande expédiée !",
    body: "Bonne nouvelle ! Votre kit de peinture par numéros a été expédié et est en route vers vous. Livraison estimée sous 2-3 jours.",
    emoji: "📦",
    color: "#059669",
  },
  delivered: {
    subject: "✅ Commande livrée — Flink Atelier",
    heading: "Commande livrée !",
    body: "Votre kit de peinture par numéros a été livré ! Nous espérons que vous allez adorer créer votre chef-d'œuvre.",
    emoji: "🎉",
    color: "#7C3AED",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  classic: "Portrait Classique",
  family: "Famille & Duo",
  kids_dream: "Rêve d'Enfant",
  pet: "Portrait Royal",
};

const TIMELINE_STEPS = ["confirmed", "processing", "shipped", "delivered"];

function buildTimeline(currentStatus: string): string {
  return TIMELINE_STEPS.map((step, i) => {
    const isActive = TIMELINE_STEPS.indexOf(currentStatus) >= i;
    const isCurrent = step === currentStatus;
    const bg = isActive ? "#C4963C" : "#E5E0D8";
    const textColor = isActive ? "#ffffff" : "#999999";
    const label = step === "confirmed" ? "Confirmée" : step === "processing" ? "Préparation" : step === "shipped" ? "Expédiée" : "Livrée";
    const num = i + 1;
    
    return `
      <td style="text-align:center;padding:0 4px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${bg};margin:0 auto 6px;line-height:36px;font-size:14px;font-weight:bold;color:${textColor};">${num}</div>
        <div style="font-size:10px;color:${isActive ? '#2B2B2B' : '#999'};font-weight:${isCurrent ? 'bold' : 'normal'};">${label}</div>
      </td>
      ${i < 3 ? `<td style="padding:0;"><div style="height:2px;width:24px;background:${isActive ? '#C4963C' : '#E5E0D8'};margin-top:-12px;"></div></td>` : ''}
    `;
  }).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { email, name, orderRef, status, kitSize, artStyle, totalPrice, category, trackingUrl } = await req.json();

    if (!email || !orderRef || !status) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = STATUS_CONFIG[status];
    if (!cfg) {
      return new Response(JSON.stringify({ error: "Unknown status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categoryLabel = CATEGORY_LABELS[category] || "Portrait Classique";
    const sizeLabel = kitSize === "stamp_kit_40x50" ? "40×50 cm" : kitSize === "stamp_kit_30x40" ? "30×40 cm" : kitSize === "stamp_kit_A4" ? "A4 (21×30 cm)" : kitSize || "";
    const trackUrl = trackingUrl || `https://flinkatelier.com/track`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#C4963C,#D4A84C);border-radius:14px;padding:12px 20px;box-shadow:0 4px 12px rgba(196,150,60,0.3);">
        <span style="color:white;font-size:20px;font-weight:bold;font-family:'Playfair Display',Georgia,serif;letter-spacing:0.5px;">Flink Atelier</span>
      </div>
    </div>
    
    <!-- Main Card -->
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06);">
      
      <!-- Status Banner -->
      <div style="background:${cfg.color};padding:24px 28px;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">${cfg.emoji}</div>
        <h1 style="font-family:'Playfair Display',Georgia,serif;color:white;font-size:24px;margin:0;font-weight:700;">${cfg.heading}</h1>
      </div>
      
      <div style="padding:28px;">
        <p style="color:#2B2B2B;font-size:15px;margin:0 0 6px;">Bonjour <strong>${name || "cher client"}</strong>,</p>
        <p style="color:#55575d;font-size:14px;line-height:1.7;margin:0 0 24px;">${cfg.body}</p>
        
        <!-- Timeline -->
        <div style="background:#FAFAF8;border-radius:12px;padding:20px 12px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>${buildTimeline(status)}</tr>
          </table>
        </div>
        
        <!-- Order Details -->
        <div style="border:1px solid #E8E0D4;border-radius:12px;overflow:hidden;margin:0 0 24px;">
          <div style="background:#FAF7F2;padding:12px 16px;border-bottom:1px solid #E8E0D4;">
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin:0;font-weight:600;">Détails de la commande</p>
          </div>
          <div style="padding:16px;">
            <table style="width:100%;font-size:13px;color:#555;">
              <tr>
                <td style="padding:6px 0;color:#999;">Référence</td>
                <td style="padding:6px 0;text-align:right;font-family:monospace;font-weight:bold;color:#2B2B2B;font-size:15px;">${orderRef}</td>
              </tr>
              ${categoryLabel ? `<tr><td style="padding:6px 0;color:#999;">Catégorie</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#2B2B2B;">${categoryLabel}</td></tr>` : ''}
              ${sizeLabel ? `<tr><td style="padding:6px 0;color:#999;">Taille</td><td style="padding:6px 0;text-align:right;color:#2B2B2B;">${sizeLabel}</td></tr>` : ''}
              ${artStyle ? `<tr><td style="padding:6px 0;color:#999;">Style</td><td style="padding:6px 0;text-align:right;color:#2B2B2B;">${artStyle}</td></tr>` : ''}
              ${totalPrice ? `
              <tr><td colspan="2" style="padding:8px 0 0;"><div style="border-top:1px solid #E8E0D4;"></div></td></tr>
              <tr>
                <td style="padding:6px 0;font-weight:bold;color:#2B2B2B;font-size:14px;">Total</td>
                <td style="padding:6px 0;text-align:right;font-weight:bold;color:#C4963C;font-size:18px;font-family:'Playfair Display',Georgia,serif;">${totalPrice} DT</td>
              </tr>` : ''}
            </table>
          </div>
        </div>
        
        <!-- CTA Button -->
        <div style="text-align:center;margin:0 0 20px;">
          <a href="${trackUrl}" style="display:inline-block;background:linear-gradient(135deg,#C4963C,#D4A84C);color:white;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(196,150,60,0.3);">
            Suivre ma commande
          </a>
        </div>
        
        <!-- Trust badges -->
        <div style="display:flex;justify-content:center;gap:16px;margin-top:16px;">
          <span style="font-size:12px;color:#999;">🚚 Livraison gratuite</span>
          <span style="font-size:12px;color:#999;">💳 Paiement à la livraison</span>
          <span style="font-size:12px;color:#999;">✅ Satisfait ou remboursé</span>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align:center;padding:24px 0 0;">
      <p style="color:#BBB;font-size:11px;margin:0 0 4px;">Flink Atelier — Peinture par numéros personnalisée en Tunisie</p>
      <p style="color:#CCC;font-size:10px;margin:0;">Vous recevez cet email car vous avez passé une commande sur flinkatelier.com</p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Flink Atelier <onboarding@resend.dev>",
        to: [email],
        subject: cfg.subject,
        html: htmlBody,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(result)}`);
    }

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
