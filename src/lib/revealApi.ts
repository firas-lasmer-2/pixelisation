/**
 * HTTP client for the Python reveal backend.
 *
 * Provides generateReveal(), pollJobStatus(), and getPreview() functions.
 * Backend URL comes from VITE_REVEAL_API_URL env var.
 * Falls back gracefully when the backend is unreachable.
 */

const REVEAL_API_URL = import.meta.env.VITE_REVEAL_API_URL || "";

export interface RevealJobResponse {
  job_id: string;
  status: string;
}

export interface RevealJobStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  stage: string;
  error: string | null;
  quality_warnings: string[];
  assets: Record<string, string>;
  manifest: Record<string, unknown> | null;
}

export interface RevealPreviewResponse {
  preview_base64: string;
  detail_level: string;
  exposed_ratio: number;
  quality_warnings: string[];
}

export interface GenerateRevealParams {
  file: File | Blob;
  detailLevel?: string;
  manufacturingMode?: string;
  kitSize?: string;
  productType?: string;
  crop?: { x: number; y: number; width: number; height: number };
  orderRef?: string;
  instructionCode?: string;
  dedicationText?: string;
  glitterPalette?: string;
  debug?: boolean;
}

export function isRevealApiAvailable(): boolean {
  return Boolean(REVEAL_API_URL);
}

export async function checkBackendHealth(): Promise<boolean> {
  if (!REVEAL_API_URL) return false;
  try {
    const res = await fetch(`${REVEAL_API_URL}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function generateReveal(
  params: GenerateRevealParams,
): Promise<RevealJobResponse> {
  if (!REVEAL_API_URL) {
    throw new Error("Reveal API not configured");
  }

  const form = new FormData();
  form.append("file", params.file);
  form.append("detail_level", params.detailLevel || "medium");
  form.append("manufacturing_mode", params.manufacturingMode || "adhesive_mask");
  form.append("kit_size", params.kitSize || "stamp_kit_30x40");
  form.append("product_type", params.productType || "stencil_paint");
  form.append("order_ref", params.orderRef || "");
  form.append("instruction_code", params.instructionCode || "");
  form.append("dedication_text", params.dedicationText || "");
  form.append("glitter_palette", params.glitterPalette || "");
  form.append("debug", String(params.debug || false));

  if (params.crop) {
    form.append("crop_x", String(params.crop.x));
    form.append("crop_y", String(params.crop.y));
    form.append("crop_width", String(params.crop.width));
    form.append("crop_height", String(params.crop.height));
  }

  const res = await fetch(`${REVEAL_API_URL}/api/reveal/generate`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Reveal API error: ${res.status}`);
  }

  return res.json();
}

export async function pollJobStatus(
  jobId: string,
): Promise<RevealJobStatus> {
  if (!REVEAL_API_URL) {
    throw new Error("Reveal API not configured");
  }

  const res = await fetch(`${REVEAL_API_URL}/api/reveal/${jobId}`);
  if (!res.ok) {
    throw new Error(`Job status error: ${res.status}`);
  }

  return res.json();
}

export async function getPreview(
  file: File | Blob,
  detailLevel: string = "medium",
  kitSize: string = "stamp_kit_30x40",
  crop?: { x: number; y: number; width: number; height: number },
): Promise<RevealPreviewResponse> {
  if (!REVEAL_API_URL) {
    throw new Error("Reveal API not configured");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("detail_level", detailLevel);
  form.append("kit_size", kitSize);

  if (crop) {
    form.append("crop_x", String(crop.x));
    form.append("crop_y", String(crop.y));
    form.append("crop_width", String(crop.width));
    form.append("crop_height", String(crop.height));
  }

  const res = await fetch(`${REVEAL_API_URL}/api/reveal/preview`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Preview API error: ${res.status}`);
  }

  return res.json();
}

/**
 * Poll a job until it reaches a terminal state (completed or failed).
 * Returns the final job status.
 */
export async function waitForJob(
  jobId: string,
  onProgress?: (status: RevealJobStatus) => void,
  intervalMs: number = 1000,
  maxWaitMs: number = 120_000,
): Promise<RevealJobStatus> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const status = await pollJobStatus(jobId);
    onProgress?.(status);

    if (status.status === "completed" || status.status === "failed") {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Job timed out");
}
