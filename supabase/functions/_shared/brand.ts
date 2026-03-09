export const BRAND = {
  name: "Helma",
  siteUrl: (Deno.env.get("HELMA_SITE_URL") || "https://helma.tn").replace(/\/+$/, ""),
  supportEmail: Deno.env.get("HELMA_SUPPORT_EMAIL") || "contact@helma.tn",
  resendFrom: Deno.env.get("RESEND_FROM_EMAIL") || "Helma <onboarding@resend.dev>",
};

export function buildTrackUrl(orderRef: string, instructionCode: string) {
  const params = new URLSearchParams({
    ref: orderRef,
    code: instructionCode,
  });

  return `${BRAND.siteUrl}/track?${params.toString()}`;
}

export function buildResumeUrl(sessionId: string) {
  const params = new URLSearchParams({
    resume: sessionId,
  });

  return `${BRAND.siteUrl}/studio?${params.toString()}`;
}
