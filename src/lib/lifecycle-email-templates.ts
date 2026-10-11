/**
 * Transactional Aki ecosystem email catalogue.
 * Rendering only. Sending requires verified, idempotent server-side events.
 * Never send from a client component or merely because a page was opened.
 */
export type EmailLocale = "en" | "es";
export type LifecycleEmailKey =
  | "claim_received" | "claim_staff" | "welcome_akipasa"
  | "welcome_akiduermo" | "welcome_akibusiness" | "welcome_akihq"
  | "event_booking_confirmed" | "event_saved_reminder"
  | "stay_booking_confirmed" | "stay_saved_reminder"
  | "stay_cancelled" | "booking_cancelled"
  | "business_team_invite" | "business_claim_approved"
  | "business_claim_denied" | "payment_receipt" | "security_email_changed";

type Translation = {subject:string; title:string; message:string; action:string; url:string};
export type EmailTemplate = {
  key:LifecycleEmailKey; locale:EmailLocale; subject:string; text:string; html:string;
};
const BASE="https://akipasa.com";
const D="https://akiduermo.akipasa.com";
const B="https://business.akipasa.com";
const H="https://hq.akipasa.com";
const review=BASE+"/en/staff/moderation?queue=claims";
const dictionary: Record<Exclude<LifecycleEmailKey,"claim_staff">,Record<EmailLocale,Translation>>={
 claim_received:{
  en:{subject:"We've received your venue claim",title:"Your claim is in review",message:"Thanks for requesting access to your venue. Our support team has received your claim and will contact you once we've checked the information. You don't need to submit it again.",action:"Explore AkiPasa",url:BASE+"/en"},
  es:{subject:"Hemos recibido tu reclamación de local",title:"Estamos revisando tu solicitud",message:"Gracias por solicitar acceso a tu local. Nuestro equipo de soporte ha recibido la reclamación y se pondrá en contacto contigo cuando hayamos revisado la información. No hace falta enviarla de nuevo.",action:"Ir a AkiPasa",url:BASE+"/es"}},
 welcome_akipasa:{
  en:{subject:"Welcome to AkiPasa!",title:"Discover what's happening nearby",message:"Your AkiPasa account is ready. Find venues and events, save favourites, explore the map and start collecting city achievements.",action:"Explore AkiPasa",url:BASE+"/en"},
  es:{subject:"¡Bienvenido a AkiPasa!",title:"Descubre lo que pasa cerca",message:"Tu cuenta de AkiPasa ya está lista. Encuentra locales y eventos, guarda favoritos, explora el mapa y consigue logros por ciudades.",action:"Descubrir AkiPasa",url:BASE+"/es"}},
 welcome_akiduermo:{
  en:{subject:"Welcome to AkiDuermo",title:"Find your next place to stay",message:"Explore accommodation, save places you love, compare dates and manage your reservations from your account. Your AkiPasa identity works here too.",action:"Explore stays",url:D},
  es:{subject:"Bienvenido a AkiDuermo",title:"Encuentra tu próxima estancia",message:"Explora alojamientos, guarda tus favoritos, compara fechas y gestiona tus reservas desde tu cuenta. También puedes utilizar tu cuenta de AkiPasa.",action:"Explorar alojamientos",url:D}},
 welcome_akibusiness:{
  en:{subject:"Welcome to AkiBusiness",title:"Your venue management starts here",message:"Claim or manage your venue, edit its public details, upload media, publish events and offers, review bookings and track promotion performance. Invite trusted teammates with the right permissions. Start by checking your venue profile.",action:"Open AkiBusiness",url:B},
  es:{subject:"Bienvenido a AkiBusiness",title:"Empieza a gestionar tu negocio",message:"Reclama o gestiona tu local, edita su información pública, sube imágenes, publica eventos y ofertas, revisa reservas y consulta tus promociones. Invita a tu equipo con los permisos adecuados. Empieza revisando la ficha del local.",action:"Abrir AkiBusiness",url:B}},
 welcome_akihq:{
  en:{subject:"Welcome to AkiHQ",title:"Your business operations workspace",message:"AkiHQ brings your PoS, inventory, CRM, customer support, team chat, tasks and sales records together. Configure your catalogue and tables, invite your team and test printing before taking live orders. Fiscal invoices are not activated by default.",action:"Open AkiHQ",url:H},
  es:{subject:"Bienvenido a AkiHQ",title:"Tu centro de operaciones",message:"AkiHQ reúne el TPV, inventario, CRM, soporte, chat del equipo, tareas y registros de ventas. Configura productos y mesas, invita al personal y prueba las impresoras antes de operar. La facturación fiscal no está activada por defecto.",action:"Abrir AkiHQ",url:H}},
 event_booking_confirmed:{
  en:{subject:"Your event booking is confirmed",title:"Your booking is confirmed",message:"Your event booking has been confirmed. Open your bookings to check the venue, time, guest count and reference. Keep this email for your records.",action:"My bookings",url:BASE+"/en/account/bookings"},
  es:{subject:"Tu reserva de evento está confirmada",title:"Reserva confirmada",message:"Tu reserva de evento está confirmada. Consulta el local, la hora, los asistentes y la referencia en Mis reservas. Guarda este correo como comprobante.",action:"Mis reservas",url:BASE+"/es/account/bookings"}},
 event_saved_reminder:{
  en:{subject:"Your saved event is coming up in 2 days",title:"An event you saved is nearly here",message:"One of your saved events starts in two days. Check the latest details and availability before making plans. Saving an event is not a booking.",action:"View saved events",url:BASE+"/en/account/saved"},
  es:{subject:"Tu evento guardado es dentro de 2 días",title:"Se acerca un evento que guardaste",message:"Uno de tus eventos guardados empieza dentro de dos días. Comprueba los detalles y la disponibilidad antes de ir. Guardar un evento no equivale a reservar.",action:"Ver eventos guardados",url:BASE+"/es/account/saved"}},
 stay_booking_confirmed:{
  en:{subject:"Your AkiDuermo reservation is confirmed",title:"Your stay is booked",message:"Your accommodation reservation has been confirmed. Review the check-in and check-out dates, property details and booking reference in your account.",action:"View my reservations",url:D+"/bookings"},
  es:{subject:"Tu reserva de AkiDuermo está confirmada",title:"Tu estancia está reservada",message:"Tu reserva de alojamiento está confirmada. Consulta las fechas de entrada y salida, los datos del alojamiento y la referencia desde tu cuenta.",action:"Ver mis reservas",url:D+"/bookings"}},
 stay_saved_reminder:{
  en:{subject:"Still thinking about that saved stay?",title:"Your saved stay is waiting",message:"You saved a place five days ago. Take another look if you're still planning a trip. Prices and availability may have changed. This is not a reservation.",action:"View saved stays",url:D+"/saved"},
  es:{subject:"¿Sigues pensando en ese alojamiento?",title:"Tu alojamiento guardado te espera",message:"Guardaste un alojamiento hace cinco días. Vuelve a verlo si sigues planeando tu viaje. Los precios y la disponibilidad pueden haber cambiado. No es una reserva.",action:"Ver alojamientos guardados",url:D+"/saved"}},
 stay_cancelled:{
  en:{subject:"Your AkiDuermo reservation was cancelled",title:"Reservation cancelled",message:"Your accommodation reservation has been cancelled. Review your account for the booking details and any applicable refund or cancellation conditions. This message does not confirm a refund.",action:"View reservations",url:D+"/bookings"},
  es:{subject:"Tu reserva de AkiDuermo se ha cancelado",title:"Reserva cancelada",message:"Tu reserva de alojamiento se ha cancelado. Consulta los datos y las condiciones de cancelación o devolución en tu cuenta. Este mensaje no confirma ningún reembolso.",action:"Ver reservas",url:D+"/bookings"}},
 booking_cancelled:{
  en:{subject:"Your AkiPasa booking was cancelled",title:"Booking cancelled",message:"Your venue or event booking was cancelled. Check the booking record for details and any applicable terms.",action:"My bookings",url:BASE+"/en/account/bookings"},
  es:{subject:"Tu reserva de AkiPasa se ha cancelado",title:"Reserva cancelada",message:"Tu reserva de local o evento se ha cancelado. Consulta los detalles y las condiciones correspondientes en el historial.",action:"Mis reservas",url:BASE+"/es/account/bookings"}},
 business_team_invite:{
  en:{subject:"You've been invited to manage a venue",title:"A team invitation for you",message:"A venue manager has invited you to collaborate in AkiBusiness. Sign in with the invited account to review your access and permissions.",action:"Open AkiBusiness",url:B},
  es:{subject:"Te han invitado a gestionar un local",title:"Tienes una invitación de equipo",message:"Un responsable te ha invitado a colaborar en AkiBusiness. Accede con la cuenta invitada para consultar tus permisos.",action:"Abrir AkiBusiness",url:B}},
 business_claim_approved:{
  en:{subject:"Your venue claim was approved",title:"Your venue is ready to manage",message:"Your ownership claim has been approved. Sign in to AkiBusiness to review your listing, update details and manage its features.",action:"Manage my venue",url:B},
  es:{subject:"Tu reclamación de local ha sido aprobada",title:"Ya puedes gestionar tu local",message:"Hemos aprobado tu solicitud. Accede a AkiBusiness para revisar la ficha, actualizar información y utilizar sus herramientas.",action:"Gestionar mi local",url:B}},
 business_claim_denied:{
  en:{subject:"Update on your venue claim",title:"We couldn't approve your claim",message:"We couldn't verify the information supplied with your venue claim. Please review the verification requirements and submit a new request with stronger evidence. Contact support if you need help.",action:"Review claims",url:B},
  es:{subject:"Actualización de tu reclamación",title:"No hemos podido aprobar tu solicitud",message:"No hemos podido verificar los datos de tu reclamación. Revisa los requisitos y envía una nueva solicitud con pruebas adicionales. Contacta con soporte si necesitas ayuda.",action:"Revisar reclamaciones",url:B}},
 payment_receipt:{
  en:{subject:"Your AkiPasa payment confirmation",title:"Payment recorded",message:"A payment has been recorded for your account. Check your billing area for the amount, status and reference. This email is not a fiscal invoice.",action:"View my account",url:BASE+"/en/account"},
  es:{subject:"Confirmación de pago de AkiPasa",title:"Pago registrado",message:"Se ha registrado un pago en tu cuenta. Consulta el importe, el estado y la referencia en tu área de facturación. Este correo no es una factura fiscal.",action:"Ver mi cuenta",url:BASE+"/es/account"}},
 security_email_changed:{
  en:{subject:"Your AkiPasa email address changed",title:"Account email updated",message:"The email address on your AkiPasa account was changed. If you didn't request this, contact support immediately and secure your account.",action:"Account settings",url:BASE+"/en/account"},
  es:{subject:"Se ha cambiado tu email de AkiPasa",title:"Correo de cuenta actualizado",message:"Se ha cambiado la dirección de correo de tu cuenta de AkiPasa. Si no has sido tú, contacta inmediatamente con soporte y protege tu cuenta.",action:"Configuración de cuenta",url:BASE+"/es/account"}}
};
const escapeHtml=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));
export const emailCatalogueKeys=Object.keys(dictionary) as Exclude<LifecycleEmailKey,"claim_staff">[];
export function renderLifecycleEmail(key:LifecycleEmailKey,locale:EmailLocale,details?:{reference?:string;venueName?:string}):EmailTemplate{
 const v=key==="claim_staff"?{
  subject:"New venue claim awaiting review",title:"A new venue claim needs your review",
  message:"A new claim was submitted. Check the applicant's evidence and approve or deny the request inside the protected Staff moderation area.",
  action:"Review claim",url:review
 }:dictionary[key][locale];
 const subject=(v.subject+(details?.venueName?" · "+details.venueName:"")).replace(/[\r\n]/g," ").slice(0,180);
 const extra=[details?.venueName?("Venue / Local: "+details.venueName):"",details?.reference?("Reference / Referencia: "+details.reference):""].filter(Boolean).join("\n");
 const text=[v.title,"",v.message,extra,"",v.action+": "+v.url,"","AkiPasa Support · support@akipasa.com"].filter(Boolean).join("\n");
 const html='<!doctype html><html lang="'+(key==="claim_staff"?"en":locale)+'"><body style="margin:0;background:#f2f5fb;font-family:Arial,sans-serif;color:#16213d"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#fff;border-radius:18px"><tr><td style="padding:30px"><p style="font-size:15px;font-weight:bold;color:#e86d20">AKIPASA · '+escapeHtml(key.includes("stay")||key.includes("akiduermo")?"AKIDUERMO":key.includes("akihq")?"AKIHQ":key.includes("akibusiness")?"AKIBUSINESS":"SUPPORT")+'</p><h1 style="font-size:26px;line-height:1.25">'+escapeHtml(v.title)+'</h1><p style="font-size:16px;line-height:1.65">'+escapeHtml(v.message)+'</p>'+(extra?'<p style="padding:12px;background:#f1f4fa;border-radius:8px;white-space:pre-line">'+escapeHtml(extra)+'</p>':"")+'<p style="margin:28px 0"><a href="'+escapeHtml(v.url)+'" style="display:inline-block;background:#615ef0;color:white;text-decoration:none;border-radius:11px;padding:15px 22px;font-weight:bold">'+escapeHtml(v.action)+'</a></p><p style="font-size:12px;color:#657089">AkiPasa Support · support@akipasa.com</p></td></tr></table></td></tr></table></body></html>';
 return {key,locale:key==="claim_staff"?"en":locale,subject,text,html};
}
export const lifecycleEmailSender="AkiPasa Support <support@akipasa.com>";
