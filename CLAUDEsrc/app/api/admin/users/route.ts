import { NextResponse } from "next/server";
import { adminUserSearchSchema, safeAdminUser } from "@/lib/admin-users";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = adminUserSearchSchema.safeParse({
    q: new URL(request.url).searchParams.get("q"),
  });
  if (!parsed.success) {
    return NextResponse.json({ users: [] }, { status: 200 });
  }

  const { data, error } = await supabase.rpc("admin_search_users", {
    p_query: parsed.data.q,
    p_limit: 20,
  });
  if (error) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json(
    { users: (data || []).map(safeAdminUser).filter(Boolean) },
    { headers: { "cache-control": "private, no-store" } },
  );
}
