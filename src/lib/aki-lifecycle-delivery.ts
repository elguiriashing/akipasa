import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  claimMailConfigured,
  claimMailEnvironment,
  type ClaimMailEnv,
} from "./claim-mail-delivery";
import {
  renderLifecycleEmail,
  lifecycleEmailSender,
  type LifecycleEmailKey,
} from "./lifecycle-email-templates";

type Job = {
 id:string;event_key:string;kind:LifecycleEmailKey;
 profile_id:string;recipient:string;locale:"es"|"en";
 payload:Record<string,string>;lease_id:string;
};
function mailKey(env: ClaimMailEnv) {
 return env.CLAIM_RESEND_API_KEY || env.RESEND_API_KEY;
}

/** Mailing preferences are always checked just before sending reminders.
 * Unsave, booking or unsubscribe after queueing always wins. */
async function reminderEligible(db: SupabaseClient,job: Job) {
 if (!["event_saved_reminder","stay_saved_reminder"].includes(job.kind))
   return true;
 const {data: prefs,error:preferencesError}=await db.from("aki_email_preferences")
  .select("saved_event_reminders,saved_stay_reminders")
  .eq("profile_id",job.profile_id).maybeSingle();
 if(preferencesError) throw preferencesError;
 if(job.kind==="event_saved_reminder"){
  if(!prefs?.saved_event_reminders)return false;
  const eventId=job.payload.eventId;
  const occurrenceId=job.payload.occurrenceId;
  if(!eventId||!occurrenceId)return false;
  const [{data:event},{data:occ},{data:saved},{data:bookings}]=await Promise.all([
   db.from("events").select("id,status,slug").eq("id",eventId).maybeSingle(),
   db.from("event_occurrences").select("id,starts_at").eq("id",occurrenceId).eq("event_id",eventId).maybeSingle(),
   db.from("saved_event_refs").select("event_key").eq("profile_id",job.profile_id).in("event_key",[eventId,job.payload.eventSlug||eventId]).limit(1),
   db.from("booking_requests").select("id").eq("profile_id",job.profile_id).eq("event_id",eventId).in("status",["requested","confirmed"]).limit(1)
  ]);
  const hours=occ ? (new Date(occ.starts_at).getTime()-Date.now())/3600000:-1;
  return event?.status==="published" && Boolean(saved?.length)&&!bookings?.length&&hours>0;
 }
 if(!prefs?.saved_stay_reminders)return false;
 const venueId=job.payload.venueId;
 if(!venueId)return false;
 const [{data:saved},{data:venue},{data:bookings}]=await Promise.all([
  db.from("aki_saved_stays").select("venue_id,saved_at").eq("profile_id",job.profile_id).eq("venue_id",venueId).maybeSingle(),
  db.from("venues").select("status,discovery_vertical").eq("id",venueId).maybeSingle(),
  db.from("accommodation_reservations").select("id").eq("profile_id",job.profile_id).eq("venue_id",venueId).in("status",["requested","confirmed","checked_in"]).limit(1)
 ]);
 return Boolean(saved)&&new Date(saved.saved_at).getTime()<=Date.now()-5*86400000
  &&venue?.status==="published"&&venue?.discovery_vertical==="accommodation"
  &&!bookings?.length;
}

async function sendLifecycle(job:Job,apiKey:string) {
 if(!apiKey)return {ok:false,error:"api_key_missing",ambiguous:false,retryable:false} as const;
 try{
  const template=renderLifecycleEmail(job.kind,job.locale,{
    venueName:job.payload.venueName,
    reference:job.payload.reference
  });
  const response=await fetch("https://api.resend.com/emails",{
   method:"POST",
   headers:{
    Authorization:"Bearer "+apiKey,
    "Content-Type":"application/json",
    "Idempotency-Key":"aki-lifecycle-"+job.id
   },
   body:JSON.stringify({
    from:lifecycleEmailSender,reply_to:"support@akipasa.com",
    to:[job.recipient],subject:template.subject,
    html:template.html,text:template.text
   }),
   signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)return {
   ok:false,error:"provider_"+response.status,
   ambiguous:response.status>=500||response.status===409,
   retryable:response.status>=500||response.status===429||response.status===409
  };
  const body=await response.json() as {id?:string};
  return body.id?{ok:true,messageId:body.id,ambiguous:false,retryable:false}
   :{ok:false,error:"invalid_provider_response",ambiguous:true,retryable:true};
 }catch{
  return {ok:false,error:"provider_unreachable",ambiguous:true,retryable:true};
 }
}

/** Scheduled and post-event dispatcher. Missing keys never lease jobs. */
export async function dispatchAkiLifecycleEmails(
 env:ClaimMailEnv=claimMailEnvironment(),
) {
 if(!claimMailConfigured(env))return {sent:0,failed:0,configured:false};
 const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error:reminderError}=await db.rpc("aki_queue_due_reminders");
 if(reminderError)console.error("aki_reminders_queue_unavailable",reminderError.code);
 const {data,error}=await db.rpc("aki_lease_email_jobs");
 if(error){
  console.error("aki_lifecycle_lease_failed",error.code);
  return {sent:0,failed:0,configured:true};
 }
 let sent=0,failed=0,cancelled=0;
 for(const raw of data||[]){
  const job=raw as Job;
  let outcome:Awaited<ReturnType<typeof sendLifecycle>>;
  try{
   if(!(await reminderEligible(db,job))){
    await db.rpc("aki_cancel_email_job",{p_id:job.id,p_lease:job.lease_id});
    cancelled++;
    continue;
   }
   outcome=await sendLifecycle(job,mailKey(env)!);
  }catch(e){
   console.error("aki_lifecycle_validation_failed",job.kind);
   outcome={ok:false,error:"validation_unavailable",ambiguous:false,retryable:true};
  }
  const {error:ackError}=await db.rpc("aki_finish_email_job",{
   p_id:job.id,p_lease:job.lease_id,p_ok:outcome.ok,
   p_message:"messageId" in outcome?outcome.messageId:null,
   p_error:"error" in outcome?outcome.error:null,
   p_ambiguous:outcome.ambiguous,p_retryable:outcome.retryable
  });
  if(ackError)console.error("aki_lifecycle_ack_failed",ackError.code);
  if(outcome.ok)sent++;else failed++;
 }
 return {sent,failed,cancelled,configured:true};
}
