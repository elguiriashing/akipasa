import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { submitEarlyPartnerFeedback } from "./actions";
import styles from "./early-partner.module.css";

const sources = [
  ["google_search", "Google Search", "Búsqueda en Google"],
  ["google_maps", "Google Maps", "Google Maps"],
  ["venue_listing", "Our AkiPasa venue listing", "Nuestra ficha en AkiPasa"],
  ["social_media", "Social media", "Redes sociales"],
  ["recommendation", "Recommendation from someone", "Recomendación de alguien"],
  [
    "business_outreach",
    "AkiPasa team contacted us",
    "Contactó el equipo de AkiPasa",
  ],
  ["other", "Somewhere else", "Otro lugar"],
] as const;
const needs = [
  ["listing", "Improve our public listing", "Mejorar nuestra ficha pública"],
  ["events", "Promote events", "Promocionar eventos"],
  ["reservations", "Manage bookings", "Gestionar reservas"],
  ["marketing", "Reach more customers", "Llegar a más clientes"],
  [
    "operations",
    "Business operations / AkiHQ",
    "Operaciones del negocio / AkiHQ",
  ],
  ["other", "Something else", "Otra necesidad"],
] as const;

export default async function EarlyPartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ claim?: string; done?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const query = await searchParams;
  const claimId = query.claim || "";
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(claimId)) notFound();
  const current = `/${locale}/business/early-partner?claim=${encodeURIComponent(claimId)}`;
  const { supabase, user } = await requireUser(locale, current);
  const { data: claim, error: claimError } = await supabase
    .from("venue_claims")
    .select("id,venue_id,status")
    .eq("id", claimId)
    .eq("claimant_id", user.id)
    .maybeSingle();
  if (claimError || !claim || claim.status !== "approved") notFound();
  const [
    { data: venue },
    { data: existing, error: feedbackError },
    { data: reward, error: rewardError },
  ] = await Promise.all([
    supabase
      .from("venues")
      .select("name")
      .eq("id", claim.venue_id)
      .maybeSingle(),
    supabase
      .from("claim_owner_feedback")
      .select("discovery_source,priority_need,comments,contact_permission")
      .eq("claim_id", claimId)
      .maybeSingle(),
    supabase.rpc("claim_partner_reward_status", { p_claim: claimId }),
  ]);
  const done = query.done === "1" && Boolean(existing);
  const active =
    reward?.state === "granted" &&
    Boolean(reward.expires_at) &&
    Date.parse(reward.expires_at) > Date.now();
  const expiry = active
    ? new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", {
        dateStyle: "long",
        timeZone: "Europe/Madrid",
      }).format(new Date(reward.expires_at))
    : null;
  return (
    <main className={styles.backdrop}>
      <article className={styles.card}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>
            AKIPASA · {es ? "SOCIOS PIONEROS" : "EARLY PARTNERS"}
          </p>
          <h1>
            {es
              ? "Tu negocio, nuestro siguiente paso."
              : "Your business, our next chapter."}
          </h1>
          <p>
            {es
              ? `¡Gracias por formar parte de AkiPasa${venue?.name ? " con " + venue.name : ""}! Estamos desarrollando las herramientas para negocios junto a nuestros primeros propietarios y queremos escucharte.`
              : `Thanks for joining AkiPasa${venue?.name ? " with " + venue.name : ""}! We're shaping our business tools together with our first venue owners and would love your input.`}
          </p>
        </header>
        <div className={styles.gift}>
          <strong>
            {es ? "Un detalle por ayudarnos" : "A thank-you for helping us"}
          </strong>
          <p>
            {es
              ? "Responde dos preguntas con tu cuenta AkiPasa verificada. Si tu reclamación está aprobada, tu local aún no tiene Premium y quedan plazas del programa, se activarán automáticamente 3 meses de Premium para esta ficha. Sin tarjeta ni renovación automática."
              : "Answer two quick questions with your verified AkiPasa account. If your ownership claim is approved, this venue has no existing Premium access and programme places remain, three months of listing Premium will activate automatically. No card and no automatic renewal."}
          </p>
        </div>
        {done ? (
          <section className={styles.success} role="status">
            <h2>
              {active
                ? es
                  ? "¡Tu Premium de 3 meses está activado!"
                  : "Your 3-month Premium is active!"
                : es
                  ? "¡Gracias por compartir tu opinión!"
                  : "Thank you for sharing your thoughts!"}
            </h2>
            <p>
              {active
                ? es
                  ? `Hemos verificado tu cuenta y activado Premium para este local hasta el ${expiry}. No se te cobrará nada ni se renovará automáticamente.`
                  : `We verified your account and activated Premium for this venue until ${expiry}. You won't be charged or automatically renewed.`
                : es
                  ? "Hemos guardado tus respuestas. Premium no se ha activado automáticamente; nuestro equipo revisará si cumples los requisitos o si ya tienes Premium."
                  : "Your answers were saved. Premium has not activated automatically; our team will check eligibility or whether you already have Premium."}
            </p>
            <a href="https://akihq.app/">
              {es ? "Visitar AkiHQ" : "Explore AkiHQ"}
            </a>
          </section>
        ) : feedbackError || rewardError ? (
          <p role="alert" className={styles.error}>
            {es
              ? "El formulario aún no está disponible. Vuelve a intentarlo más tarde o responde al correo de soporte."
              : "The survey is temporarily unavailable. Please try again later or reply to the support email."}
          </p>
        ) : (
          <form action={submitEarlyPartnerFeedback} className={styles.form}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="claimId" value={claimId} />
            <fieldset>
              <legend>
                {es
                  ? "1. ¿Cómo nos conociste?"
                  : "1. How did you hear about us?"}
              </legend>
              <div className={styles.options}>
                {sources.map(([id, en, spanish]) => (
                  <label key={id} className={styles.option}>
                    <input
                      type="radio"
                      name="source"
                      value={id}
                      required
                      defaultChecked={existing?.discovery_source === id}
                    />
                    <span>{es ? spanish : en}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>
                {es
                  ? "2. ¿Qué te ayudaría más en tu negocio?"
                  : "2. What would help your business most?"}
              </legend>
              <div className={styles.options}>
                {needs.map(([id, en, spanish]) => (
                  <label key={id} className={styles.option}>
                    <input
                      type="radio"
                      name="need"
                      value={id}
                      required
                      defaultChecked={existing?.priority_need === id}
                    />
                    <span>{es ? spanish : en}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className={styles.notes}>
              <strong>
                {es
                  ? "¿Algo más que deberíamos crear o mejorar? (opcional)"
                  : "Anything else we should build or improve? (optional)"}
              </strong>
              <textarea
                name="comments"
                rows={4}
                maxLength={1000}
                defaultValue={existing?.comments || ""}
                placeholder={
                  es
                    ? "Cuéntanos qué necesita tu negocio..."
                    : "Tell us what your venue actually needs..."
                }
              />
            </label>
            <label className={styles.consent}>
              <input
                type="checkbox"
                name="contactPermission"
                value="yes"
                defaultChecked={existing?.contact_permission || false}
              />
              <span>
                {es
                  ? "Sí, podéis contactarme para una incorporación personalizada y hablar de mis respuestas."
                  : "Yes, you can contact me for tailored onboarding and to discuss my feedback."}
              </span>
            </label>
            {query.error && (
              <p className={styles.error} role="alert">
                {es
                  ? "No se pudo guardar la respuesta. Inténtalo de nuevo."
                  : "Your answer could not be saved. Please try again."}
              </p>
            )}
            <button type="submit">
              {es ? "Enviar mis respuestas" : "Send my answers"}
            </button>
            <small>
              {es
                ? "Tus respuestas son privadas, no son reseñas públicas y no te inscriben en publicidad."
                : "Your answers are private, not public reviews, and don't subscribe you to marketing."}
            </small>
          </form>
        )}
      </article>
    </main>
  );
}
