import { createClient } from "@supabase/supabase-js";

type PublicationEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  AKISUITE_SUBSCRIPTIONS_READY?: string;
  AKISUITE_FEATURES_READY?: string;
};

/** Service-only, bounded queue; SQL locks and approval fingerprints prevent duplicate publication. */
export async function publishScheduledAkiSuiteEvents(env: PublicationEnv) {
  if (
    env.AKISUITE_FEATURES_READY !== "true" ||
    env.AKISUITE_SUBSCRIPTIONS_READY !== "true" ||
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.SUPABASE_SERVICE_ROLE_KEY
  )
    return { published: 0, enabled: false };
  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await db.rpc("publish_due_akisuite_events", {
    p_limit: 25,
  });
  if (error) {
    console.error("akisuite_publication_queue_unavailable", error.code);
    return { published: 0, enabled: true, failed: true };
  }
  return { published: Number(data || 0), enabled: true };
}
