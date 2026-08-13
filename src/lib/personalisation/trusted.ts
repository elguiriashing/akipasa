import { cookies } from "next/headers";
import type { BehaviourEntityType, BehaviourEventType } from "./schema";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function recordTrustedBehaviour({
  eventType,
  profileId,
  entityType,
  entityId,
  surface,
  metadata = {},
  essential = false,
}: {
  eventType:
    | BehaviourEventType
    | "event_checked_in"
    | "passport_progressed"
    | "passport_completed";
  profileId: string;
  entityType: BehaviourEntityType;
  entityId: string;
  surface: string;
  metadata?: Record<string, string | number | boolean | null>;
  essential?: boolean;
}) {
  try {
    const cookieStore = await cookies();
    const anonymousId = cookieStore.get("ak_anonymous_id")?.value;
    const sessionId = cookieStore.get("ak_session_id")?.value;
    if (!anonymousId || !sessionId) return;
    const service = createSupabaseServiceClient();
    let allowed = cookieStore.get("ak_personalisation")?.value === "granted";
    if (allowed) {
      const { data } = await service
        .from("personalisation_settings")
        .select("personalisation_enabled")
        .eq("profile_id", profileId)
        .maybeSingle();
      allowed = Boolean(data?.personalisation_enabled);
    }
    if (!allowed && !essential) return;
    await service.rpc("ingest_behaviour_batch", {
      p_events: [
        {
          event_id: crypto.randomUUID(),
          schema_version: 1,
          event_type: eventType,
          entity_type: entityType,
          entity_id: entityId,
          occurred_at: new Date().toISOString(),
          surface,
          context: {},
          metadata,
        },
      ],
      p_profile: profileId,
      p_anonymous: anonymousId,
      p_session: sessionId,
      p_personalisation_allowed: allowed,
      p_verified: true,
    });
  } catch {
    // Behavioural logging never changes the outcome of the primary action.
  }
}
