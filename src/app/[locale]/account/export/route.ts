import {
  communityStoriesExportReady,
  readCommunityStoryExports,
} from "@/lib/community-stories-export";
import {
  privateIdentityExportsReady,
  readPrivateIdentityExports,
} from "@/lib/identity-private-export";
import { readBusinessFunnelExport } from "@/lib/business-funnel-export";
import { readSuiteEmailExport } from "@/lib/suite-email-export";
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
  // The delivery outbox remains server-only. Its caller-scoped RPC provides
  // portability without granting direct table access or using a service key.
  derivedEntries.push(await readSuiteEmailExport(supabase));
  // Schema readiness remains on while optional retained records exist, even
  // when new Story collection is disabled. Missing expected RPC fails the export.
  if (communityStoriesExportReady()) {
    derivedEntries.push(...(await readCommunityStoryExports(supabase)));
  }
  if (onboardingEnabled()) {
    const receipt = await supabase.rpc("my_account_onboarding");
    derivedEntries.push({
      table: "account_onboarding",
      data: receipt.data ? [receipt.data] : [],
      failed: Boolean(receipt.error),
    });
  }
  // Data portability remains available when the separate prestige launch gate is closed.
  if (
    !privateIdentityExportsReady() &&
    process.env.AKIPASA_PRESTIGE_SCHEMA_READY === "true"
  ) {
    const prestige = await supabase.rpc("prestige_member", {
      p_action: "export",
    });
    derivedEntries.push({
      table: "passport_prestige",
      data: prestige.data ? [prestige.data] : [],
      failed: Boolean(prestige.error),
    });
  }
  // Schema readiness stays enabled while retained optional rows exist, independently
  // of database collection activation and account feature/onboarding restrictions.
  if (process.env.AKISUITE_FUNNEL_READY === "true") {
    derivedEntries.push(await readBusinessFunnelExport(supabase));
  }
  if (privateIdentityExportsReady()) {
    derivedEntries.push(...(await readPrivateIdentityExports(supabase)));
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
