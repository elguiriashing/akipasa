import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { submitBusinessApplication } from "../actions";

type BusinessApplication = {
  id: string;
  business_name: string;
  state: string;
  payment_state: string;
  review_reason: string | null;
  created_at: string;
};

export default async function BusinessApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/business/apply`,
  );
  const { data } = await supabase
    .from("business_applications")
    .select("id,business_name,state,payment_state,review_reason,created_at")
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false });
  const applications = (data || []) as BusinessApplication[];
  const current = applications.find((application) =>
    ["submitted", "under_review", "awaiting_payment", "active"].includes(
      application.state,
    ),
  );
  const es = locale === "es";

  return (
    <main className="shell dashboard">
      <section className="hero">
        <div className="eyebrow">
          {es ? "AkiPasa para negocios" : "AkiPasa for businesses"}
        </div>
        <h1>{es ? "Publica tu negocio" : "Bring your business to AkiPasa"}</h1>
        <p className="lede">
          {es
            ? "Solicita acceso, completa la revision y gestiona locales, eventos, promociones y fidelidad."
            : "Apply for access, complete review, then manage venues, events, promotions, and loyalty."}
        </p>
        <Link href={`/${locale}/account`}>
          {es ? "<- Volver a la cuenta" : "<- Back to account"}
        </Link>
      </section>

      {query.submitted && (
        <p className="notice">
          {es
            ? "Solicitud enviada. El equipo la revisara antes del siguiente paso."
            : "Application submitted. Staff will review it before the next step."}
        </p>
      )}
      {query.error && (
        <p className="notice">
          {es
            ? "No se pudo enviar la solicitud. Revisa los campos o una solicitud existente."
            : "The application could not be submitted. Check the fields or an existing application."}
        </p>
      )}

      <section className="dashboard-grid business-application-grid">
        <article className="panel console-card">
          <span className="status-pill">
            {es ? "1. Solicitud" : "1. Application"}
          </span>
          <h2>{es ? "Datos del negocio" : "Business details"}</h2>
          <p>
            {es
              ? "Cuentanos quien eres y que quieres publicar."
              : "Tell us who you are and what you want to publish."}
          </p>
        </article>
        <article className="panel console-card">
          <span className="status-pill">
            {es ? "2. Revision" : "2. Review"}
          </span>
          <h2>{es ? "Verificacion del equipo" : "Staff verification"}</h2>
          <p>
            {es
              ? "Comprobamos la relacion con el negocio y la calidad del catalogo."
              : "We verify the business relationship and catalogue quality."}
          </p>
        </article>
        <article className="panel console-card">
          <span className="status-pill">{es ? "3. Pago" : "3. Payment"}</span>
          <h2>
            {es ? "EUR 20/mes o EUR 190/ano" : "EUR 20/month or EUR 190/year"}
          </h2>
          <p>
            {es
              ? "El plan anual ahorra EUR 50. El pago se abre solo despues de la revision."
              : "The annual plan saves EUR 50. Checkout opens only after staff review."}
          </p>
        </article>
      </section>

      {current ? (
        <section className="panel console-card">
          <span className="status-pill">{current.state}</span>
          <h2>{current.business_name}</h2>
          <p>
            {es ? "Estado de pago" : "Payment status"}:{" "}
            <strong>{current.payment_state}</strong>
          </p>
          {current.review_reason && <p>{current.review_reason}</p>}
          {current.state === "active" && (
            <Link className="button" href={`/${locale}/business`}>
              {es ? "Abrir panel de negocio" : "Open business dashboard"}
            </Link>
          )}
          {current.state === "awaiting_payment" && (
            <Link className="button" href={`/${locale}/account/subscription`}>
              {es ? "Elegir plan y pagar" : "Choose plan and pay"}
            </Link>
          )}
        </section>
      ) : (
        <form
          action={submitBusinessApplication}
          className="panel stack focused-form"
        >
          <input type="hidden" name="locale" value={locale} />
          <label>
            {es ? "Nombre del negocio" : "Business name"}
            <input name="businessName" required minLength={2} maxLength={160} />
          </label>
          <label>
            {es ? "Persona de contacto" : "Contact name"}
            <input name="contactName" required minLength={2} maxLength={120} />
          </label>
          <label>
            {es ? "Localidad" : "Locality"}
            <input name="locality" required minLength={2} maxLength={120} />
          </label>
          <label>
            {es ? "Web HTTPS (opcional)" : "HTTPS website (optional)"}
            <input name="websiteUrl" type="url" placeholder="https://" />
          </label>
          <label>
            {es ? "Sobre el negocio" : "About the business"}
            <textarea name="message" required minLength={20} maxLength={2000} />
          </label>
          <button className="button" type="submit">
            {es ? "Enviar solicitud" : "Submit application"}
          </button>
        </form>
      )}
    </main>
  );
}
