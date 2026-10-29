import { accountReturnPath } from "@/lib/account-return-path";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import {
  referralCode,
  referralCaseLabel,
  referralDashboardSchema,
  representativeEvidenceSchema,
  referralShareUrl,
} from "@/lib/referrals";
import {
  captureReferral,
  reportReferralCase,
  joinReferralProgramme,
  saveReferralLead,
  updateReferralLead,
} from "./actions";
import "./referrals.css";
import RepresentativeEvidence from "./RepresentativeEvidence";
export default async function Referrals({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string; result?: string; period?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const query = await searchParams;
  const code = referralCode(query.ref);
  const { supabase, user } = await requireUser(
    locale,
    accountReturnPath(
      locale,
      `/${locale}/account/referrals?${new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string"))}`,
    ),
  );
  const ready = process.env.AKISUITE_REFERRALS_READY === "true";
  const [overview, rep, leads, cases] = ready
    ? await Promise.all([
        supabase.rpc("suite_referral_dashboard"),
        supabase
          .from("suite_referral_representatives")
          .select("state")
          .eq("profile_id", user.id)
          .maybeSingle(),
        supabase
          .from("suite_referral_leads")
          .select("id,business_name,stage,created_at")
          .eq("representative_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("suite_referral_cases")
          .select("id,case_type,state,resolution,created_at")
          .eq("reporter_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ])
    : [
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ];
  const days = query.period === "30" ? 30 : query.period === "365" ? 365 : 90;
  const representativeEvidence =
    ready &&
    rep.data?.state === "approved" &&
    process.env.AKISUITE_REFERRAL_REP_EVIDENCE_READY === "true"
      ? await supabase.rpc("suite_referral_representative_evidence", {
          p_days: days,
        })
      : { data: null, error: null };
  const evidence = representativeEvidenceSchema.safeParse(
    representativeEvidence.data,
  );
  const parsed = referralDashboardSchema.safeParse(overview.data);
  const data = parsed.success ? parsed.data : null;
  const messages: Record<string, string> = {
    saved: es
      ? "Guardado. Los pagos siguen pendientes de aprobación."
      : "Saved. Payouts remain pending approval.",
    ineligible: es
      ? "Este código no se puede aplicar a esta cuenta. No se ha cambiado tu atribución."
      : "This code cannot be applied to this account. Your attribution was not changed.",
    invalid: es ? "Revisa los datos." : "Check the entered details.",
    unavailable: es
      ? "No disponible. Inténtalo de nuevo más tarde."
      : "Unavailable. Try again later.",
  };
  return (
    <section className="referral-workspace">
      <header>
        <p>AkiSuite</p>
        <h1>{es ? "Recomendaciones y ventas" : "Referrals and sales"}</h1>
        <p>
          {es
            ? "Comparte tu código y sigue tus recomendaciones sin revelar datos de clientes."
            : "Share your code and track recommendations without exposing customer details."}
        </p>
      </header>
      <p role="status">{query.result ? messages[query.result] || "" : null}</p>
      {!ready || !data ? (
        <p>
          {es
            ? "El programa aún no está disponible. No hay descuentos ni comisiones activos."
            : "The programme is not available yet. Discounts and commissions are not active."}
        </p>
      ) : (
        <>
          <div className="referral-metrics">
            <article>
              <strong>{data.referrals}</strong>
              <span>{es ? "Recomendaciones" : "Referrals"}</span>
            </article>
            <article>
              <strong>{data.conversions}</strong>
              <span>
                {es
                  ? "Cuentas con factura pagada"
                  : "Accounts with a paid invoice"}
              </span>
            </article>
            <article>
              <strong>{data.invoice_count}</strong>
              <span>{es ? "Facturas verificadas" : "Verified invoices"}</span>
            </article>
          </div>
          {data.available_programmes.map((programme) => (
            <form action={joinReferralProgramme} key={programme.id}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="programme" value={programme.id} />
              <strong>{programme.name}</strong>
              <p>
                {es
                  ? "Participación sin incentivos monetarios activos."
                  : "Participation without active monetary incentives."}
              </p>
              <button>{es ? "Obtener mi código" : "Get my code"}</button>
            </form>
          ))}
          <h2>{es ? "Tus enlaces" : "Your links"}</h2>
          {data.codes.length === 0 ? (
            <p>
              {es
                ? "Aún no tienes un código asignado."
                : "No code has been assigned yet."}
            </p>
          ) : (
            data.codes.map((c) => (
              <article key={c.code}>
                <strong>{c.code}</strong>
                <label>
                  {es ? "Enlace para compartir" : "Shareable link"}
                  <input readOnly value={referralShareUrl(c.code, locale)} />
                </label>
                {c.revoked && (
                  <p>{es ? "Código suspendido" : "Code suspended"}</p>
                )}
              </article>
            ))
          )}
          <p>
            {es
              ? "La atribución se guarda una sola vez en la cuenta AkiSuite compartida. Las conversiones no garantizan una recompensa. Descuentos, comisiones y pagos requieren términos y aprobación adicionales."
              : "Attribution is saved once against the shared AkiSuite account. Conversions do not guarantee a reward. Discounts, commissions and payouts require additional terms and approval."}
          </p>
          <h2>
            {es
              ? "Actividad reciente (últimos 50)"
              : "Recent activity (latest 50)"}
          </h2>
          {data.recent_activity.map((activity, i) => (
            <article key={`${activity.recorded_at}-${i}`}>
              <span>
                {activity.kind === "paid"
                  ? es
                    ? "Factura pagada verificada"
                    : "Verified paid invoice"
                  : activity.kind === "refund_hold"
                    ? es
                      ? "Retención por reembolso"
                      : "Refund hold"
                    : es
                      ? "Retención por disputa"
                      : "Dispute hold"}
              </span>
              <time dateTime={activity.recorded_at}>
                {new Date(activity.recorded_at).toLocaleDateString(
                  locale === "es" ? "es-ES" : "en-GB",
                  { timeZone: "Europe/Madrid" },
                )}
              </time>
            </article>
          ))}
          <form action={captureReferral}>
            <h2>
              {es ? "¿Te han recomendado AkiSuite?" : "Referred to AkiSuite?"}
            </h2>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="product" value="akipasa" />
            <label>
              {es ? "Código de recomendación" : "Referral code"}
              <input
                name="code"
                pattern="[A-Z0-9]{8,24}"
                minLength={8}
                maxLength={24}
                defaultValue={code || ""}
                required
              />
            </label>
            <button>
              {es ? "Aplicar a mi cuenta" : "Apply to my account"}
            </button>
          </form>
          <form action={reportReferralCase}>
            <input type="hidden" name="locale" value={locale} />
            <h2>{es ? "Solicitar revisión" : "Request review"}</h2>
            <p>
              {es
                ? "Usa tu código o el que aplicaste a tu cuenta. No incluyas datos privados de otros clientes."
                : "Use your code or the code applied to your account. Do not include private details of other customers."}
            </p>
            <label>
              {es ? "Código" : "Code"}
              <input name="code" pattern="[A-Z0-9]{8,24}" required />
            </label>
            <label>
              {es ? "Motivo" : "Reason"}
              <select name="kind">
                <option value="attribution_dispute">
                  {es ? "Disputa de atribución" : "Attribution dispute"}
                </option>
                <option value="fraud">
                  {es ? "Posible fraude" : "Possible fraud"}
                </option>
                <option value="refund">{es ? "Reembolso" : "Refund"}</option>
                <option value="other">{es ? "Otro" : "Other"}</option>
              </select>
            </label>
            <label>
              {es ? "Detalles" : "Details"}
              <textarea name="detail" minLength={5} maxLength={2000} required />
            </label>
            <button>{es ? "Enviar a revisión" : "Submit for review"}</button>
          </form>
          <h2>
            {es ? "Tus revisiones (últimas 50)" : "Your reviews (latest 50)"}
          </h2>
          {cases.error ? (
            <p>{es ? "No se pueden cargar." : "Could not load reviews."}</p>
          ) : (
            cases.data?.map((item) => (
              <article key={item.id}>
                <span>{referralCaseLabel(item.case_type, locale)}</span>
                <strong>
                  {
                    (es
                      ? {
                          open: "Abierta",
                          reviewing: "En revisión",
                          resolved: "Resuelta",
                          rejected: "Rechazada",
                        }
                      : {
                          open: "Open",
                          reviewing: "Reviewing",
                          resolved: "Resolved",
                          rejected: "Rejected",
                        })[
                      item.state as
                        | "open"
                        | "reviewing"
                        | "resolved"
                        | "rejected"
                    ]
                  }
                </strong>
                <p>{item.resolution}</p>
              </article>
            ))
          )}
          {rep.data?.state === "approved" && (
            <>
              <RepresentativeEvidence
                locale={locale}
                days={days}
                data={
                  !representativeEvidence.error && evidence.success
                    ? evidence.data
                    : null
                }
              />
              <form action={saveReferralLead}>
                <h2>{es ? "Registrar oportunidad" : "Register lead"}</h2>
                <input type="hidden" name="locale" value={locale} />
                <label>
                  {es ? "Negocio" : "Business"}
                  <input
                    name="business"
                    minLength={2}
                    maxLength={160}
                    required
                  />
                </label>
                <label>
                  Email
                  <input name="email" type="email" maxLength={254} />
                </label>
                <label>
                  {es
                    ? "Notas (solo información necesaria)"
                    : "Notes (necessary information only)"}
                  <textarea name="notes" maxLength={2000} />
                </label>
                <button>{es ? "Guardar oportunidad" : "Save lead"}</button>
              </form>
              <h2>
                {es
                  ? "Tus oportunidades (últimas 50)"
                  : "Your leads (latest 50)"}
              </h2>
              {leads.error ? (
                <p>
                  {es ? "No se han podido cargar." : "Could not load leads."}
                </p>
              ) : (
                leads.data?.map((lead) => (
                  <form action={updateReferralLead} key={lead.id}>
                    <strong>{lead.business_name}</strong>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={lead.id} />
                    <label>
                      {es ? "Etapa" : "Stage"}
                      <select name="stage" defaultValue={lead.stage}>
                        {[
                          "registered",
                          "qualified",
                          "contacted",
                          "converted",
                          "lost",
                        ].map((stage, i) => (
                          <option key={stage} value={stage}>
                            {
                              (es
                                ? [
                                    "Registrada",
                                    "Cualificada",
                                    "Contactada",
                                    "Convertida",
                                    "Perdida",
                                  ]
                                : [
                                    "Registered",
                                    "Qualified",
                                    "Contacted",
                                    "Converted",
                                    "Lost",
                                  ])[i]
                            }
                          </option>
                        ))}
                      </select>
                    </label>
                    <button>{es ? "Actualizar" : "Update"}</button>
                  </form>
                ))
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
