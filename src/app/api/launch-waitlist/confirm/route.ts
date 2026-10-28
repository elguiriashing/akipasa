import { createClient } from "@supabase/supabase-js";
import { digestToken } from "@/lib/launch-waitlist";

export const dynamic = "force-dynamic";

function outcome(request: Request, status: string, locale: string) {
  const url = new URL("/waitlist/confirm", request.url);
  url.searchParams.set("status", status);
  url.searchParams.set("lang", locale === "en" ? "en" : "es");
  return Response.redirect(url, 303);
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (
    length > 2048 ||
    !request.headers
      .get("content-type")
      ?.startsWith("application/x-www-form-urlencoded")
  )
    return outcome(request, "invalid", "es");

  // Bound the actual streamed bytes, not just caller-controlled Content-Length.
  // A 200-byte confirmation must never cause an unbounded multipart parse.
  let form: URLSearchParams;
  try {
    const reader = request.body?.getReader();
    if (!reader) return outcome(request, "invalid", "es");
    let total = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 2048) throw new Error("body_too_large");
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    form = new URLSearchParams(new TextDecoder().decode(bytes));
  } catch {
    return outcome(request, "invalid", "es");
  }
  const entry = form.get("entry") ?? "";
  const token = form.get("token") ?? "";
  const locale = form.get("lang") ?? "es";
  if (!/^[a-f0-9-]{36}$/i.test(entry) || !/^[a-f0-9]{64}$/i.test(token))
    return outcome(request, "invalid", locale);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return outcome(request, "unavailable", locale);
  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await db
    .from("launch_waitlist_entries")
    .update({
      verified_at: new Date().toISOString(),
      verification_hash: null,
      verification_expires_at: null,
    })
    .eq("id", entry)
    .eq("verification_hash", digestToken(token))
    .gt("verification_expires_at", new Date().toISOString())
    .is("verified_at", null)
    .select("id")
    .maybeSingle();

  if (error) return outcome(request, "unavailable", locale);
  return outcome(request, data ? "confirmed" : "invalid", locale);
}
