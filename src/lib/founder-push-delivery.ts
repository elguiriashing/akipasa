import { createClient } from "@supabase/supabase-js";
import { founderPushEnabled,founderUserIds } from "./founder-push";

export type PushEnv={
  NEXT_PUBLIC_SUPABASE_URL?:string;SUPABASE_SERVICE_ROLE_KEY?:string;
  AKIPASA_PUSH_ENABLED?:string;AKIPASA_PUSH_FOUNDER_IDS?:string;
  FIREBASE_SERVICE_ACCOUNT_JSON?:string;FIREBASE_PROJECT_ID?:string;
};
function b64url(bytes: Uint8Array):string {
  let str="";for(const byte of bytes)str+=String.fromCharCode(byte);
  return btoa(str).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
async function googleAccessToken(serviceAccount:{client_email:string;private_key:string}) {
  const pem=serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"");
  const decoded=atob(pem);
  const binary=Uint8Array.from(decoded,c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey("pkcs8",binary,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const now=Math.floor(Date.now()/1000);
  const header=b64url(new TextEncoder().encode(JSON.stringify({alg:"RS256",typ:"JWT"})));
  const claims=b64url(new TextEncoder().encode(JSON.stringify({
    iss:serviceAccount.client_email,scope:"https://www.googleapis.com/auth/firebase.messaging",
    aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600,
  })));
  const bytes=new TextEncoder().encode(header+"."+claims);
  const signature=b64url(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,bytes)));
  const response=await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:header+"."+claims+"."+signature}),
    signal:AbortSignal.timeout(8000),
  });
  if(!response.ok)throw new Error("google_oauth_"+response.status);
  const data=await response.json() as {access_token?:string};
  if(!data.access_token)throw new Error("missing_google_token");
  return data.access_token;
}
async function deliver(token:string,claimId:string,accessToken:string,project:string) {
  const response=await fetch("https://fcm.googleapis.com/v1/projects/"+encodeURIComponent(project)+"/messages:send",{
    method:"POST",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},
    body:JSON.stringify({message:{token,data:{type:"venue_claim",claim_id:claimId},
      android:{priority:"high",ttl:"3600s"}}}),
    signal:AbortSignal.timeout(8000),
  });
  return response.status;
}
export async function dispatchFounderClaimPushes(env:PushEnv){
  if(!founderPushEnabled(env)||!env.FIREBASE_SERVICE_ACCOUNT_JSON
    ||!env.FIREBASE_PROJECT_ID||!env.SUPABASE_SERVICE_ROLE_KEY||!env.NEXT_PUBLIC_SUPABASE_URL)
    return {configured:false,sent:0};
  let account:{client_email:string;private_key:string;project_id:string};
  try {account=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);} catch{return {configured:false,sent:0};}
  if(account.project_id!==env.FIREBASE_PROJECT_ID || !account.client_email || !account.private_key)
    return {configured:false,sent:0};
  const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false}
  });
  const {data:queue,error}=await db.rpc("claim_due_push_deliveries");
  if(error){console.error("founder_push_queue_unavailable",error.code);return {configured:true,sent:0};}
  let sent=0;let accessToken:string|null=null;
  const founders=founderUserIds(env.AKIPASA_PUSH_FOUNDER_IDS);
  for(const job of queue||[]){
    let status="blocked",reason="ineligible";
    try{
      const {data:rows,error:deviceError}=await db.rpc("active_founder_push_device",{p_device:job.device_id});
      if(deviceError)throw new Error("session_validation_failed");
      const device=rows?.[0];
      if(device && new Date(device.expires_at).getTime()>Date.now() &&
        founders.has(String(device.user_id).toLowerCase()) &&
        Date.now()-new Date(job.created_at).getTime()<3600000){
        const [{data:profile},{data:claim}]=await Promise.all([
          db.from("profiles").select("app_role").eq("id",device.user_id).maybeSingle(),
          db.from("venue_claims").select("status").eq("id",job.claim_id).maybeSingle(),
        ]);
        if(profile?.app_role==="administrator"&&claim?.status==="pending"){
          if(!accessToken)accessToken=await googleAccessToken(account);
          const result=await deliver(device.token,job.claim_id,accessToken,env.FIREBASE_PROJECT_ID);
          if(result===200){status="sent";reason="";sent++;}
          else if([400,404,410].includes(result)){
            reason="fcm_invalid_"+result;
            await db.from("admin_push_devices").delete().eq("id",job.device_id);
          }else {status="failed";reason="fcm_provider_"+result;}
        }
      }
    }catch{reason="provider_unconfirmed";} // Uncertain deliveries never retry automatically.
    const {error:ack}=await db.rpc("finish_claim_push_delivery",{
      p_claim:job.claim_id,p_device:job.device_id,p_lease:job.lease_id,
      p_status:status,p_error:reason,
    });
    if(ack)console.error("founder_push_ack_failed",ack.code);
  }
  return {configured:true,sent};
}
