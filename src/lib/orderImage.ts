const MAX_INLINE_IMAGE_BYTES = 1_400_000;
const MAX_INLINE_IMAGE_DIMENSION = 1600;
const OUTPUT_MIME_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.86;

export const MAX_CREATE_ORDER_PAYLOAD_BYTES = 4 * 1024 * 1024;

export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return 0;

  const base64 = dataUrl.slice(commaIndex + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function estimateJsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function isCreateOrderPayloadTooLarge(payload: unknown): boolean {
  return estimateJsonBytes(payload) > MAX_CREATE_ORDER_PAYLOAD_BYTES;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data");
  }

  const [, mimeType, base64] = match;
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image"));
    };

    img.src = objectUrl;
  });
}

export async function optimizeOrderImageSource(source: string | Blob): Promise<string> {
  if (typeof source === "string" && !source.startsWith("data:image/")) {
    return source;
  }

  const blob = typeof source === "string" ? dataUrlToBlob(source) : source;
  const fallback = typeof source === "string" ? source : await blobToDataUrl(blob);

  if (!blob.type.startsWith("image/")) {
    return fallback;
  }

  try {
    const image = await loadImageFromBlob(blob);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const longestEdge = Math.max(width, height);
    const needsResize = longestEdge > MAX_INLINE_IMAGE_DIMENSION;
    const needsReencode = blob.size > MAX_INLINE_IMAGE_BYTES || needsResize;

    if (!needsReencode) {
      return fallback;
    }

    const scale = needsResize ? MAX_INLINE_IMAGE_DIMENSION / longestEdge : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return fallback;
    }

    // Flatten transparency before exporting to JPEG to keep previews predictable.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const optimized = canvas.toDataURL(OUTPUT_MIME_TYPE, OUTPUT_QUALITY);
    return estimateDataUrlBytes(optimized) < estimateDataUrlBytes(fallback) ? optimized : fallback;
  } catch {
    return fallback;
  }
}