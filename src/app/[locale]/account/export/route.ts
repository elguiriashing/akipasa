import { NextResponse } from "next/server";
import {
  accountExportTables,
  exportableAuthentication,
} from "@/lib/account-export";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const entries = await Promise.all(
    accountExportTables.map(async ([table, column]) => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq(column, user.id);
      return { table, data: data || [], failed: Boolean(error) };
    }),
  );
  const preferenceProfile = entries.find(
    (entry) => entry.table === "preference_profiles",
  )?.data?.[0] as { id?: string } | undefined;
  const derivedEntries = preferenceProfile?.id
    ? await Promise.all(
        [
          "user_preference_signals",
          "recommendation_requests",
          "experiment_assignments",
        ].map(async (table) => {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .eq("preference_profile_id", preferenceProfile.id!);
          return { table, data: data || [], failed: Boolean(error) };
        }),
      )
    : [];
  const recommendationIds = (
    derivedEntries.find((entry) => entry.table === "recommendation_requests")
      ?.data || []
  )
    .map((row) => (row as { id?: string }).id)
    .filter((id): id is string => Boolean(id));
  const recommendationItems = recommendationIds.length
    ? await supabase
        .from("recommendation_items")
        .select("*")
        .in("recommendation_request_id", recommendationIds)
    : { data: [], error: null };
  derivedEntries.push({
    table: "recommendation_items",
    data: recommendationItems.data || [],
    failed: Boolean(recommendationItems.error),
  });
  const failedTables = [...entries, ...derivedEntries]
    .filter((entry) => entry.failed)
    .map((entry) => entry.table);
  if (failedTables.length)
    return NextResponse.json(
      {
        error: "A complete export could not be generated. Try again later.",
        unavailable_tables: failedTables,
      },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  return NextResponse.json(
    {
      exported_at: new Date().toISOString(),
      account_id: user.id,
      email: user.email,
      authentication: exportableAuthentication(user),
      data: Object.fromEntries(
        [...entries, ...derivedEntries].map((entry) => [
          entry.table,
          entry.data,
        ]),
      ),
    },
    {
      headers: {
        "Content-Disposition":
          'attachment; filename="akipasa-account-export.json"',
        "Cache-Control": "private, no-store",
      },
    },
  );
}
