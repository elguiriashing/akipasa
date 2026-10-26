import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { optionalUser } from "@/lib/auth";
import { founderPushEnabled, founderUserIds } from "@/lib/founder-push";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const tokenPattern = /^[A-Za-z0-9:_-]{20,4096}$/;

function serviceDb() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{
    auth: { persistSession:false,autoRefreshToken:false },
  });
}
async function authorized() {
  const { user, supabase } = await optionalUser();
  if (!user || !founderUserIds(process.env.AKIPASA_PUSH_FOUNDER_IDS).has(user.id.toLowerCase()))
    return null;
  const { data, error } = await supabase.from("profiles").select("app_role")
    .eq("id",user.id).maybeSingle();
  return !error && data?.app_role === "administrator" ? {user,supabase} : null;
}
export async function POST(req: NextRequest) {
  if (!founderPushEnabled(process.env)) return new NextResponse(null,{status:404,headers:noStore});
  // Reject cross-origin requests even when browser cookies are present.
  if (req.headers.get("origin") !== "https://akipasa.com" ||
      !/\bAkiPasaAndroid\//.test(req.headers.get("user-agent") || ""))
    return new NextResponse(null,{status:403,headers:noStore});
  const identity = await authorized();
  if (!identity) return new NextResponse(null,{status:403,headers:noStore});
  let json: unknown;
  try { json = await req.json(); } catch { return new NextResponse(null,{status:400,headers:noStore}); }
  const token = (json && typeof json === "object" && "token" in json) ?
    (json as { token?: unknown }).token : null;
  if (typeof token !== "string" || !tokenPattern.test(token))
    return new NextResponse(null,{status:400,headers:noStore});
  const {data:{session}}=await identity.supabase.auth.getSession();
  let sessionId: unknown;
  try {
    const payload=JSON.parse(Buffer.from((session?.access_token || "").split(".")[1] || "","base64url").toString("utf8"));
    sessionId=payload.session_id;
  } catch { /* Invalid sessions are rejected below. */ }
  if(typeof sessionId!=="string" || !/^[0-9a-f-]{36}$/i.test(sessionId))
    return new NextResponse(null,{status:403,headers:noStore});
  const db=serviceDb();
  if (!db) return new NextResponse(null,{status:503,headers:noStore});
  const {error}=await db.from("admin_push_devices").upsert({
    user_id:identity.user.id,session_id:sessionId,token,last_seen_at:new Date().toISOString(),
    expires_at:new Date(Date.now()+30*24*60*60*1000).toISOString(),
  },{onConflict:"token"});
  if (error) {
    console.error("founder_push_registration_failed",error.code);
    return new NextResponse(null,{status:503,headers:noStore});
  }
  return new NextResponse(null,{status:204,headers:noStore});
}
export async function DELETE(req:NextRequest) {
  if (req.headers.get("origin") !== "https://akipasa.com")
    return new NextResponse(null,{status:403,headers:noStore});
  const identity=await authorized(),db=serviceDb();
  if (!identity || !db) return new NextResponse(null,{status:403,headers:noStore});
  const {error}=await db.from("admin_push_devices").delete().eq("user_id",identity.user.id);
  return new NextResponse(null,{status:error?503:204,headers:noStore});
}
