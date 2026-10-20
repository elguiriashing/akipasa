import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdministrator } from "@/lib/roles";
export async function GET() {
  if (process.env.AKISUITE_REFERRALS_READY !== "true")
    return new Response("Unavailable", { status: 503 });
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const profile = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile.error || !isAdministrator(profile.data?.app_role || ""))
    return new Response("Forbidden", { status: 403 });
  const exported: Record<string, unknown[]> = {};
  for (const [table, key] of [
    ["suite_referral_programmes", "id"],
    ["suite_referral_codes", "code"],
    ["suite_referral_billing_events", "stripe_event_id"],
    ["suite_referral_audit", "id"],
    ["suite_referral_cases", "id"],
    ...(process.env.AKISUITE_REFERRAL_APPROVAL_SCHEMA_READY === "true"
      ? [["suite_referral_payout_reviews", "revision"]]
      : []),
  ]) {
    const rows: unknown[] = [];
    let expectedCount: number | null = null;
    for (let offset = 0; offset <= 10000; offset += 1000) {
      const result = await supabase
        .from(table)
        .select("*", { count: "exact" })
        .order(key)
        .range(offset, offset + 999)
        .retry(false);
      if (result.error || !Array.isArray(result.data) || result.count === null)
        return new Response("Export failed", { status: 503 });
      if (expectedCount !== null && expectedCount !== result.count)
        return new Response("Export changed; retry", { status: 409 });
      expectedCount = result.count;
      if (result.count > 10000)
        return new Response("Export requires an administrator batch", {
          status: 413,
        });
      rows.push(...result.data);
      if (rows.length === result.count) break;
      if (result.data.length === 0)
        return new Response("Export changed; retry", { status: 409 });
    }
    if (expectedCount !== rows.length)
      return new Response("Export incomplete", { status: 503 });
    exported[table] = rows;
  }
  return Response.json(
    {
      generated_at: new Date().toISOString(),
      payouts_enabled: false,
      exported,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition":
          "attachment; filename=akisuite-referral-audit.json",
      },
    },
  );
}
