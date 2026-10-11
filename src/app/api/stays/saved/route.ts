import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicRequestOrigin } from "@/lib/public-request-origin";

const savedSchema=z.object({
 venueId:z.string().uuid(),
 locale:z.enum(["en","es"]),
});

/** Only authenticated, on-host requests mirror AkiDuermo saves into the
 * account. Browser-local favourites continue working for anonymous visitors. */
async function handleSaved(request:Request,method:"POST"|"DELETE") {
 const origin=request.headers.get("origin");
 if(!origin||origin!==publicRequestOrigin(request.headers,new URL(request.url).origin))
  return NextResponse.json({error:"origin_mismatch"},{status:403});
 let parsed;
 try{parsed=savedSchema.safeParse(await request.json())}
 catch{return NextResponse.json({error:"invalid_payload"},{status:400})}
 if(!parsed.success)return NextResponse.json({error:"invalid_payload"},{status:400});
 const sb=await createSupabaseServerClient();
 const {data:{user}}=await sb.auth.getUser();
 if(!user)return NextResponse.json({error:"sign_in_required"},{status:401});
 const v=parsed.data;
 if(method==="POST"){
  const {data:venue,error:venueError}=await sb.from("venues")
   .select("id").eq("id",v.venueId).eq("discovery_vertical","accommodation")
   .eq("status","published").maybeSingle();
  if(venueError||!venue)return NextResponse.json({error:"venue_unavailable"},{status:404});
  const {error}=await sb.from("aki_saved_stays").upsert({
   profile_id:user.id,venue_id:v.venueId,locale:v.locale
  },{onConflict:"profile_id,venue_id",ignoreDuplicates:true});
  return error?NextResponse.json({error:"save_failed"},{status:500})
   :NextResponse.json({ok:true});
 }
 const {error}=await sb.from("aki_saved_stays").delete()
  .eq("profile_id",user.id).eq("venue_id",v.venueId);
 return error?NextResponse.json({error:"remove_failed"},{status:500})
   :NextResponse.json({ok:true});
}
export async function POST(request:Request){return handleSaved(request,"POST")}
export async function DELETE(request:Request){return handleSaved(request,"DELETE")}
