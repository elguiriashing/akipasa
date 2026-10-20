import { onboardingEnabled } from "@/lib/account-onboarding";
import { NextResponse } from "next/server";
import {
  currentAccountExportTables,
  createAccountExportReader,
  exportableAuthentication,
  readAccountRecommendationItems,
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
  const read = createAccountExportReader(supabase);
  const entries = await Promise.all(
    currentAccountExportTables().map(([table, column]) =>
      read(table, column, user.id),
    ),
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
        ].map((table) =>
          read(table, "preference_profile_id", preferenceProfile.id!),
        ),
      )
    : [];
  const recommendationIds = (
    derivedEntries.find((entry) => entry.table === "recommendation_requests")
      ?.data || []
  )
    .map((row) => (row as { id?: string }).id)
    .filter((id): id is string => Boolean(id));
  derivedEntries.push(
    await readAccountRecommendationItems(read, recommendationIds),
  );
  const bookingEmails = await supabase.rpc("my_booking_email_export");
  derivedEntries.push({
    table: "booking_confirmation_emails",
    data: bookingEmails.data || [],
    failed: Boolean(bookingEmails.error),
  });
  if (onboardingEnabled()) {
    const receipt = await supabase.rpc("my_account_onboarding");
    derivedEntries.push({
      table: "account_onboarding",
      data: receipt.data ? [receipt.data] : [],
      failed: Boolean(receipt.error),
    });
  }
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
