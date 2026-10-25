type PrivacyRetentionEnv = {
  ACCOUNT_DELETION_RETENTION_READY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export async function purgeAccountDeletionEvidence(
  env: PrivacyRetentionEnv,
  fetcher: typeof fetch = fetch,
) {
  if (env.ACCOUNT_DELETION_RETENTION_READY !== "true") return;
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Privacy maintenance unavailable");
  const origin = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  if (origin.protocol !== "https:")
    throw new Error("Encrypted privacy endpoint required");
  const response = await fetcher(
    new URL("/rest/v1/rpc/purge_account_deletion_evidence", origin),
    {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error("Privacy maintenance failed");
}
