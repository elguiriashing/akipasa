export type FunnelMaintenanceEnv = {
  AKISUITE_FUNNEL_READY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};
/** Central server scheduler adapter; optional measurement only, never a billing action. */
export async function purgeBusinessFunnel(
  env: FunnelMaintenanceEnv,
  fetcher: typeof fetch = fetch,
) {
  if (env.AKISUITE_FUNNEL_READY !== "true")
    return { enabled: false, removed: 0 };
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
    throw Error("Funnel maintenance bindings unavailable");
  const response = await fetcher(
    `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/purge_suite_business_funnel`,
    {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_limit: 500 }),
    },
  );
  if (!response.ok) throw Error("Funnel maintenance unavailable");
  const removed: unknown = await response.json();
  if (
    !Number.isInteger(removed) ||
    Number(removed) < 0 ||
    Number(removed) > 1000
  )
    throw Error("Invalid funnel maintenance result");
  return { enabled: true, removed: Number(removed) };
}
