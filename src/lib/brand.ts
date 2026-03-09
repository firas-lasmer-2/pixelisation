export const BRAND = Object.freeze({
  name: "Helma",
  adminName: "Helma Admin",
  siteUrl: "https://helma.tn",
  domain: "helma.tn",
  supportEmail: "contact@helma.tn",
  pdfName: "HELMA",
});

export const STORAGE_KEYS = Object.freeze({
  locale: "helma-locale",
  theme: "helma-theme",
  session: "helma-session",
  recovery: "helma-recovery",
  viewerCompleted: "helma-viewer-completed",
  viewerDataPrefix: "helma-viewer-data-",
  progressPrefix: "helma-progress-",
});

const LEGACY_STORAGE_KEYS = {
  "flink-locale": STORAGE_KEYS.locale,
  "flink-theme": STORAGE_KEYS.theme,
  "flink-session": STORAGE_KEYS.session,
  "flink-recovery": STORAGE_KEYS.recovery,
  "flink-viewer-completed": STORAGE_KEYS.viewerCompleted,
} as const;

const LEGACY_PREFIXES = {
  "flink-viewer-data-": STORAGE_KEYS.viewerDataPrefix,
  "flink-progress-": STORAGE_KEYS.progressPrefix,
} as const;

export function buildTrackUrl(orderRef?: string, instructionCode?: string, origin?: string) {
  const base = `${origin || BRAND.siteUrl}/track`;
  const params = new URLSearchParams();

  if (orderRef) params.set("ref", orderRef);
  if (instructionCode) params.set("code", instructionCode);

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function migrateLegacyStorage() {
  if (typeof window === "undefined") return;

  for (const [legacyKey, nextKey] of Object.entries(LEGACY_STORAGE_KEYS)) {
    const legacyValue = window.localStorage.getItem(legacyKey);
    if (legacyValue !== null && window.localStorage.getItem(nextKey) === null) {
      window.localStorage.setItem(nextKey, legacyValue);
    }
  }

  for (const [legacyPrefix, nextPrefix] of Object.entries(LEGACY_PREFIXES)) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(legacyPrefix)) continue;

      const nextKey = nextPrefix + key.slice(legacyPrefix.length);
      if (window.localStorage.getItem(nextKey) !== null) continue;

      const value = window.localStorage.getItem(key);
      if (value !== null) {
        window.localStorage.setItem(nextKey, value);
      }
    }
  }
}
