import { supabase } from "@/integrations/supabase/client";

interface FunnelEventInput {
  sessionId: string;
  eventName: string;
  category?: string | null;
  step?: number | null;
  orderRef?: string | null;
  metadata?: Record<string, unknown>;
}

export async function trackFunnelEvent(input: FunnelEventInput) {
  try {
    await supabase.from("funnel_events").insert({
      session_id: input.sessionId,
      event_name: input.eventName,
      category: input.category || null,
      step: input.step ?? null,
      order_ref: input.orderRef || null,
      metadata: input.metadata || {},
    });
  } catch (error) {
    console.warn("Failed to track funnel event", error);
  }
}
