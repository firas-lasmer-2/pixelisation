import { BRAND, buildResumeUrl, buildTrackUrl } from "./brand.ts";

const STATUS_CONFIG: Record<string, { subject: string; heading: string; body: string; emoji: string; color: string }> = {
  confirmed: {
    subject: "🎨 Commande confirmée — Helma",
    heading: "Commande confirmée !",
    body: "Votre commande a été reçue et confirmée. Nous préparons maintenant votre kit personnalisé.",
    emoji: "✅",
    color: "#C4963C",
  },
  processing: {
    subject: "🖌️ Votre kit est en préparation — Helma",
    heading: "Kit en cours de préparation",
    body: "Votre kit est en cours de préparation. Notre équipe finalise chaque détail avec soin.",
    emoji: "🖌️",
    color: "#2563EB",
  },
  shipped: {
    subject: "📦 Votre commande est expédiée — Helma",
    heading: "Commande expédiée !",
    body: "Bonne nouvelle : votre kit a quitté notre atelier et est en route vers vous.",
    emoji: "📦",
    color: "#059669",
  },
  delivered: {
    subject: "✅ Commande livrée — Helma",
    heading: "Commande livrée !",
    body: "Votre kit a été livré. Il ne vous reste plus qu'à commencer votre peinture.",
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

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  paint_by_numbers: "Peinture par numéros",
  stencil_paint: "Pochoir Révélation",
  glitter_reveal: "Paillettes Révélation",
};

const TIMELINE_STEPS = ["confirmed", "processing", "shipped", "delivered"];

function buildTimeline(currentStatus: string): string {
  return TIMELINE_STEPS.map((step, i) => {
    const isActive = TIMELINE_STEPS.indexOf(currentStatus) >= i;
    const isCurrent = step === currentStatus;
    const bg = isActive ? "#C4963C" : "#E5E0D8";
    const textColor = isActive ? "#ffffff" : "#999999";
    const label =
      step === "confirmed" ? "Confirmée" : step === "processing" ? "Préparation" : step === "shipped" ? "Expédiée" : "Livrée";
    const num = i + 1;

    return `
      <td style="text-align:center;padding:0 4px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${bg};margin:0 auto 6px;line-height:36px;font-size:14px;font-weight:bold;color:${textColor};">${num}</div>
        <div style="font-size:10px;color:${isActive ? "#2B2B2B" : "#999"};font-weight:${isCurrent ? "bold" : "normal"};">${label}</div>
      </td>
      ${i < 3 ? `<td style="padding:0;"><div style="height:2px;width:24px;background:${isActive ? "#C4963C" : "#E5E0D8"};margin-top:-12px;"></div></td>` : ""}
    `;
  }).join("");
}

function sizeLabel(kitSize?: string | null) {
  if (kitSize === "stamp_kit_40x50") return "40×50 cm";
  if (kitSize === "stamp_kit_30x40") return "30×40 cm";
  if (kitSize === "stamp_kit_40x60") return "40×60 cm";
  if (kitSize === "stamp_kit_A4") return "A4 (21×30 cm)";
  if (kitSize === "stamp_kit_A3") return "A3 (29,7×42 cm)";
  if (kitSize === "stamp_kit_A2") return "A2 (42×59,4 cm)";
  return kitSize || "";
}

function categoryLabel(category?: string | null) {
  return CATEGORY_LABELS[category || "classic"] || CATEGORY_LABELS.classic;
}

export async function sendStatusEmail(payload: {
  email: string;
  name?: string;
  orderRef: string;
  instructionCode: string;
  status: string;
  kitSize?: string | null;
  artStyle?: string | null;
  totalPrice?: number | null;
  category?: string | null;
  productType?: string | null;
  trackingUrl?: string | null;
  trackingNumber?: string | null;
  courierName?: string | null;
  fulfillmentNote?: string | null;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const cfg = STATUS_CONFIG[payload.status];
  if (!cfg) {
    throw new Error("Unknown status");
  }

  const resolvedCategoryLabel = categoryLabel(payload.category);
  const resolvedProductTypeLabel = payload.productType ? (PRODUCT_TYPE_LABELS[payload.productType] || payload.productType) : null;
  const trackUrl = payload.trackingUrl || buildTrackUrl(payload.orderRef, payload.instructionCode);

  const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#C4963C,#D4A84C);border-radius:14px;padding:12px 20px;box-shadow:0 4px 12px rgba(196,150,60,0.3);">
        <span style="color:white;font-size:20px;font-weight:bold;font-family:'Playfair Display',Georgia,serif;letter-spacing:0.5px;">${BRAND.name}</span>
      </div>
    </div>

    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06);">
      <div style="background:${cfg.color};padding:24px 28px;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">${cfg.emoji}</div>
        <h1 style="font-family:'Playfair Display',Georgia,serif;color:white;font-size:24px;margin:0;font-weight:700;">${cfg.heading}</h1>
      </div>

      <div style="padding:28px;">
        <p style="color:#2B2B2B;font-size:15px;margin:0 0 6px;">Bonjour <strong>${payload.name || "cher client"}</strong>,</p>
        <p style="color:#55575d;font-size:14px;line-height:1.7;margin:0 0 24px;">${cfg.body}</p>

        <div style="background:#FAFAF8;border-radius:12px;padding:20px 12px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>${buildTimeline(payload.status)}</tr>
          </table>
        </div>

        <div style="border:1px solid #E8E0D4;border-radius:12px;overflow:hidden;margin:0 0 24px;">
          <div style="background:#FAF7F2;padding:12px 16px;border-bottom:1px solid #E8E0D4;">
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin:0;font-weight:600;">Détails de la commande</p>
          </div>
          <div style="padding:16px;">
            <table style="width:100%;font-size:13px;color:#555;">
              <tr>
                <td style="padding:6px 0;color:#999;">Référence</td>
                <td style="padding:6px 0;text-align:right;font-family:monospace;font-weight:bold;color:#2B2B2B;font-size:15px;">${payload.orderRef}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#999;">Code de suivi</td>
                <td style="padding:6px 0;text-align:right;font-family:monospace;font-weight:bold;color:#2B2B2B;font-size:15px;">${payload.instructionCode}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#999;">Catégorie</td>
                <td style="padding:6px 0;text-align:right;font-weight:600;color:#2B2B2B;">${resolvedCategoryLabel}</td>
              </tr>
              ${resolvedProductTypeLabel ? `<tr><td style="padding:6px 0;color:#999;">Type de kit</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#2B2B2B;">${resolvedProductTypeLabel}</td></tr>` : ""}
              ${payload.kitSize ? `<tr><td style="padding:6px 0;color:#999;">Taille</td><td style="padding:6px 0;text-align:right;color:#2B2B2B;">${sizeLabel(payload.kitSize)}</td></tr>` : ""}
              ${payload.artStyle ? `<tr><td style="padding:6px 0;color:#999;">Style</td><td style="padding:6px 0;text-align:right;color:#2B2B2B;">${payload.artStyle}</td></tr>` : ""}
              ${payload.courierName ? `<tr><td style="padding:6px 0;color:#999;">Transporteur</td><td style="padding:6px 0;text-align:right;color:#2B2B2B;">${payload.courierName}</td></tr>` : ""}
              ${payload.trackingNumber ? `<tr><td style="padding:6px 0;color:#999;">N° suivi</td><td style="padding:6px 0;text-align:right;font-family:monospace;color:#2B2B2B;">${payload.trackingNumber}</td></tr>` : ""}
              ${payload.fulfillmentNote ? `<tr><td style="padding:6px 0;color:#999;">Note</td><td style="padding:6px 0;text-align:right;color:#2B2B2B;">${payload.fulfillmentNote}</td></tr>` : ""}
              ${payload.totalPrice ? `
              <tr><td colspan="2" style="padding:8px 0 0;"><div style="border-top:1px solid #E8E0D4;"></div></td></tr>
              <tr>
                <td style="padding:6px 0;font-weight:bold;color:#2B2B2B;font-size:14px;">Total</td>
                <td style="padding:6px 0;text-align:right;font-weight:bold;color:#C4963C;font-size:18px;font-family:'Playfair Display',Georgia,serif;">${payload.totalPrice} DT</td>
              </tr>` : ""}
            </table>
          </div>
        </div>

        <div style="text-align:center;margin:0 0 20px;">
          <a href="${trackUrl}" style="display:inline-block;background:linear-gradient(135deg,#C4963C,#D4A84C);color:white;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(196,150,60,0.3);">
            Suivre ma commande
          </a>
        </div>

        <div style="display:flex;justify-content:center;gap:16px;margin-top:16px;">
          <span style="font-size:12px;color:#999;">🚚 Livraison gratuite</span>
          <span style="font-size:12px;color:#999;">💳 Paiement à la livraison</span>
          <span style="font-size:12px;color:#999;">✅ Support ${BRAND.supportEmail}</span>
        </div>
      </div>
    </div>

    <div style="text-align:center;padding:24px 0 0;">
      <p style="color:#BBB;font-size:11px;margin:0 0 4px;">${BRAND.name} — Kits créatifs personnalisés en Tunisie</p>
      <p style="color:#CCC;font-size:10px;margin:0;">Vous recevez cet email car vous avez passé une commande sur ${BRAND.siteUrl.replace(/^https?:\/\//, "")}</p>
    </div>
  </div>
</body>
</html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: BRAND.resendFrom,
      to: [payload.email],
      subject: cfg.subject,
      html: htmlBody,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Resend API error [${response.status}]: ${JSON.stringify(result)}`);
  }

  return result;
}

export async function sendRecoveryEmail(payload: {
  email: string;
  name?: string | null;
  sessionId: string;
  stepReached?: number | null;
  category?: string | null;
  kitSize?: string | null;
  dreamJob?: string | null;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const resumeUrl = buildResumeUrl(payload.sessionId);
  const resolvedCategoryLabel = categoryLabel(payload.category);
  const progressLabel = payload.stepReached ? `Étape ${payload.stepReached}` : "Commande commencée";
  const dreamJobLine = payload.dreamJob ? `<p style="margin:8px 0 0;color:#55575d;font-size:14px;">Rêve choisi : <strong>${payload.dreamJob}</strong></p>` : "";

  const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#C4963C,#D4A84C);border-radius:14px;padding:12px 20px;">
        <span style="color:white;font-size:20px;font-weight:bold;font-family:'Playfair Display',Georgia,serif;">${BRAND.name}</span>
      </div>
    </div>

    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.06);">
      <div style="padding:28px 28px 20px;border-bottom:1px solid #EEE6DA;">
        <p style="margin:0 0 10px;color:#C4963C;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Reprise de commande</p>
        <h1 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:26px;color:#2B2B2B;">Votre projet Helma vous attend</h1>
        <p style="margin:12px 0 0;color:#55575d;font-size:14px;line-height:1.7;">
          Bonjour <strong>${payload.name || "cher client"}</strong>, vous pouvez reprendre votre création exactement là où vous l'avez laissée.
        </p>
      </div>

      <div style="padding:24px 28px;">
        <div style="background:#FAF7F2;border:1px solid #E8E0D4;border-radius:12px;padding:16px 18px;margin-bottom:24px;">
          <p style="margin:0;color:#999;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Commande sauvegardée</p>
          <p style="margin:12px 0 0;color:#2B2B2B;font-size:15px;font-weight:600;">${resolvedCategoryLabel}</p>
          <p style="margin:8px 0 0;color:#55575d;font-size:14px;">Progression : <strong>${progressLabel}</strong></p>
          ${payload.kitSize ? `<p style="margin:8px 0 0;color:#55575d;font-size:14px;">Taille sélectionnée : <strong>${sizeLabel(payload.kitSize)}</strong></p>` : ""}
          ${dreamJobLine}
        </div>

        <div style="text-align:center;margin-bottom:18px;">
          <a href="${resumeUrl}" style="display:inline-block;background:linear-gradient(135deg,#C4963C,#D4A84C);color:white;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:600;">
            Reprendre ma commande
          </a>
        </div>

        <p style="margin:0;color:#777;font-size:12px;line-height:1.6;text-align:center;">
          Si vous changez d'appareil, certains visuels devront peut-être être rechargés pour poursuivre votre création.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: BRAND.resendFrom,
      to: [payload.email],
      subject: "Reprenez votre commande Helma",
      html: htmlBody,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Resend API error [${response.status}]: ${JSON.stringify(result)}`);
  }

  return result;
}
