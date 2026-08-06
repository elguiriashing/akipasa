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
  const failedTables = entries
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
        entries.map((entry) => [entry.table, entry.data]),
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
