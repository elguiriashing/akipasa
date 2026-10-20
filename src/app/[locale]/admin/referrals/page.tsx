import {
  referralCaseLabel,
  referralEvidenceLabel,
  referralReviewLabel,
} from "@/lib/referrals";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { isAdministrator } from "@/lib/roles";
import {
  assignReferralCode,
  reviewReferralCase,
  reviewReferralPayout,
  revokeReferralCode,
  saveReferralProgramme,
  setReferralProgrammeState,
  setRepresentative,
} from "./actions";
import "../../account/referrals/referrals.css";
export default async function ReferralStudio({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/admin/referrals`,
  );
  const profile = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isAdministrator(profile.data?.app_role || "")) notFound();
  const query = await searchParams;
  const ready = process.env.AKISUITE_REFERRALS_READY === "true";
  const [programmes, codes, events, cases] = ready
    ? await Promise.all([
        supabase
          .from("suite_referral_programmes")
          .select("id,name,programme_type,state,eligible_products")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("suite_referral_codes")
          .select("code,owner_profile_id,revoked_at")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("suite_referral_billing_events")
          .select("stripe_event_id,event_kind,eligibility,recorded_at")
          .order("recorded_at", { ascending: false })
          .limit(50),
        supabase
          .from("suite_referral_cases")
          .select("id,code,case_type,detail,state,resolution,created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ])
    : [
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ];
  const approvalSchemaReady =
    ready && process.env.AKISUITE_REFERRAL_APPROVAL_SCHEMA_READY === "true";
  const reviewQueue = approvalSchemaReady
    ? await supabase.rpc("suite_referral_payout_review_queue")
    : { data: null, error: null };
  type ReviewRow = {
    event_id: string;
    code: string;
    currency: string;
    proposed_cents: number | null;
    blockers: string[];
    eligible: boolean;
    latest_state: string | null;
    effective_approval: boolean;
    reviews_enabled: boolean;
  };
  const reviews = Array.isArray(reviewQueue.data)
    ? (reviewQueue.data as ReviewRow[])
    : [];
  const hidden = <input type="hidden" name="locale" value={locale} />;
  return (
    <section className="referral-workspace">
      <header>
        <p>AkiSuite</p>
        <h1>{es ? "Estudio de recomendaciones" : "Referral studio"}</h1>
        <p>
          {es
            ? "Programas y atribución compartida. Descuentos, comisiones y desembolsos permanecen desactivados."
            : "Programmes and shared attribution. Discounts, commissions and disbursement remain disabled."}
        </p>
      </header>
      {query.result && (
        <p role="status">
          {query.result === "saved"
            ? es
              ? "Guardado"
              : "Saved"
            : es
              ? "No se pudo guardar. Revisa los datos y vuelve a intentarlo."
              : "Could not save. Check the data and try again."}
        </p>
      )}
      {!ready ? (
        <p>
          {es
            ? "Activa el despliegue solo tras validar la migración, RLS y webhooks."
            : "Activate rollout only after migration, RLS and webhook acceptance."}
        </p>
      ) : (
        <>
          <form action={saveReferralProgramme}>
            {hidden}
            <h2>
              {es ? "Nuevo programa (borrador)" : "New programme (draft)"}
            </h2>
            <label>
              {es ? "Nombre" : "Name"}
              <input name="name" required minLength={2} maxLength={120} />
            </label>
            <label>
              {es ? "Tipo" : "Type"}
              <select name="type">
                <option value="public">{es ? "Público" : "Public"}</option>
                <option value="representative">
                  {es ? "Representante" : "Representative"}
                </option>
                <option value="partner">{es ? "Socio" : "Partner"}</option>
              </select>
            </label>
            <label>
              {es
                ? "Productos elegibles (IDs separados por comas)"
                : "Eligible products (comma-separated IDs)"}
              <input name="products" required maxLength={500} />
            </label>
            <label>
              {es
                ? "Ventana de atribución (días)"
                : "Attribution window (days)"}
              <input
                name="days"
                type="number"
                min={1}
                max={365}
                defaultValue={30}
                required
              />
            </label>
            <label>
              {es
                ? "Inicio UTC (opcional, ISO 8601)"
                : "UTC start (optional, ISO 8601)"}
              <input name="starts" placeholder="2026-11-01T00:00:00Z" />
            </label>
            <label>
              {es
                ? "Fin UTC (opcional, ISO 8601)"
                : "UTC end (optional, ISO 8601)"}
              <input name="ends" placeholder="2026-12-01T00:00:00Z" />
            </label>
            <label>
              {es ? "Base de comisión propuesta" : "Proposed commission basis"}
              <select name="basis">
                <option value="">{es ? "Sin decidir" : "Undecided"}</option>
                <option value="initial_invoice">
                  {es ? "Primera factura" : "Initial invoice"}
                </option>
                <option value="each_invoice">
                  {es ? "Cada factura" : "Each invoice"}
                </option>
              </select>
            </label>
            <label>
              {es
                ? "Descuento fijo propuesto (céntimos, opcional; sin porcentaje)"
                : "Proposed fixed discount (cents, optional; no percentage)"}
              <input
                name="discountFixed"
                type="number"
                min={1}
                max={10000000}
              />
            </label>
            <label>
              {es
                ? "Comisión fija propuesta (céntimos, opcional; sin porcentaje)"
                : "Proposed fixed commission (cents, optional; no percentage)"}
              <input
                name="commissionFixed"
                type="number"
                min={1}
                max={10000000}
              />
            </label>
            <label>
              {es
                ? "Descuento propuesto % (opcional, no activo)"
                : "Proposed discount % (optional, inactive)"}
              <input
                name="discount"
                type="number"
                min={0.01}
                max={100}
                step="0.01"
              />
            </label>
            <label>
              {es
                ? "Comisión propuesta % (opcional, no activa)"
                : "Proposed commission % (optional, inactive)"}
              <input
                name="commission"
                type="number"
                min={0.01}
                max={100}
                step="0.01"
              />
            </label>
            <label>
              {es
                ? "Versión de condiciones propuestas"
                : "Proposed terms version"}
              <input name="terms" maxLength={120} />
            </label>
            <button>{es ? "Crear borrador" : "Create draft"}</button>
          </form>
          <h2>{es ? "Programas (últimos 100)" : "Programmes (latest 100)"}</h2>
          {programmes.error ? (
            <p role="alert">{es ? "Error de lectura" : "Read failed"}</p>
          ) : (
            programmes.data?.map((p) => (
              <form action={setReferralProgrammeState} key={p.id}>
                {hidden}
                <input type="hidden" name="id" value={p.id} />
                <strong>{p.name}</strong>
                <code>{p.id}</code>
                <label>
                  {es
                    ? "Estado de atribución (sin dinero)"
                    : "Attribution state (no money)"}
                  <select name="state" defaultValue={p.state}>
                    <option value="draft">{es ? "Borrador" : "Draft"}</option>
                    <option value="active">{es ? "Activo" : "Active"}</option>
                    <option value="suspended">
                      {es ? "Suspendido" : "Suspended"}
                    </option>
                  </select>
                </label>
                <button>{es ? "Aplicar" : "Apply"}</button>
              </form>
            ))
          )}
          <form action={assignReferralCode}>
            {hidden}
            <h2>{es ? "Asignar código" : "Assign code"}</h2>
            <label>
              {es ? "ID del programa" : "Programme ID"}
              <input name="programme" required />
            </label>
            <label>
              {es ? "ID del usuario" : "User ID"}
              <input name="owner" required />
            </label>
            <label>
              {es ? "Límite de usos (opcional)" : "Usage limit (optional)"}
              <input name="limit" type="number" min={1} max={100000} />
            </label>
            <button>{es ? "Generar y asignar" : "Generate and assign"}</button>
          </form>
          <form action={setRepresentative}>
            {hidden}
            <h2>{es ? "Acceso de representante" : "Representative access"}</h2>
            <label>
              {es ? "ID del usuario" : "User ID"}
              <input name="profile" required />
            </label>
            <label>
              {es ? "Estado" : "State"}
              <select name="state">
                <option value="approved">{es ? "Aprobado" : "Approved"}</option>
                <option value="suspended">
                  {es ? "Suspendido" : "Suspended"}
                </option>
              </select>
            </label>
            <button>{es ? "Guardar acceso" : "Save access"}</button>
          </form>
          <h2>{es ? "Códigos (últimos 100)" : "Codes (latest 100)"}</h2>
          {codes.error ? (
            <p role="alert">{es ? "Error de lectura" : "Read failed"}</p>
          ) : (
            codes.data?.map((c) => (
              <form action={revokeReferralCode} key={c.code}>
                {hidden}
                <input type="hidden" name="code" value={c.code} />
                <strong>{c.code}</strong>
                <span>{c.owner_profile_id}</span>
                <button disabled={Boolean(c.revoked_at)}>
                  {es ? "Revocar" : "Revoke"}
                </button>
              </form>
            ))
          )}
          <h2>
            {es
              ? "Disputas y revisión de fraude (últimos 50)"
              : "Disputes and fraud review (latest 50)"}
          </h2>
          {cases.error ? (
            <p role="alert">
              {es
                ? "No se pueden cargar los casos."
                : "Cases could not be loaded."}
            </p>
          ) : (
            cases.data?.map((item) => (
              <form action={reviewReferralCase} key={item.id}>
                {hidden}
                <input type="hidden" name="id" value={item.id} />
                <strong>
                  {item.code} · {referralCaseLabel(item.case_type, locale)}
                </strong>
                <p>{item.detail}</p>
                <label>
                  {es ? "Estado de revisión" : "Review state"}
                  <select name="state" defaultValue={item.state}>
                    <option value="open">{es ? "Abierto" : "Open"}</option>
                    <option value="reviewing">
                      {es ? "En revisión" : "Reviewing"}
                    </option>
                    <option value="resolved">
                      {es ? "Resuelto" : "Resolved"}
                    </option>
                    <option value="rejected">
                      {es ? "Rechazado" : "Rejected"}
                    </option>
                  </select>
                </label>
                <label>
                  {es
                    ? "Resolución visible para el solicitante (sin autorizar pagos)"
                    : "Resolution shared with reporter (does not authorize payouts)"}
                  <textarea
                    name="resolution"
                    maxLength={2000}
                    defaultValue={item.resolution}
                  />
                </label>
                <button>{es ? "Guardar revisión" : "Save review"}</button>
              </form>
            ))
          )}
          {approvalSchemaReady && (
            <section
              aria-label={
                es ? "Revisión de elegibilidad" : "Eligibility review"
              }
            >
              <h2>
                {es
                  ? "Elegibilidad y aprobación administrativa"
                  : "Eligibility and administrative approval"}
              </h2>
              <p>
                {es
                  ? "Registro interno para revisión futura. Incluso una aprobación mantiene los pagos desactivados y no crea un saldo pagadero."
                  : "Internal record for future review. Approval keeps disbursement disabled and creates no payable balance."}
              </p>
              {reviewQueue.error ? (
                <p role="alert">
                  {es
                    ? "No se puede cargar la elegibilidad."
                    : "Eligibility could not be loaded."}
                </p>
              ) : (
                reviews.map((row) => (
                  <article key={row.event_id}>
                    <strong>
                      {row.code} · {row.event_id}
                    </strong>
                    <p>
                      {es ? "Estado registrado" : "Recorded state"}:{" "}
                      {row.latest_state ||
                        (es ? "Sin revisión" : "Not reviewed")}
                      . {es ? "Aprobación efectiva" : "Effective approval"}:{" "}
                      {row.effective_approval
                        ? es
                          ? "Sí, solo revisión"
                          : "Yes, review only"
                        : es
                          ? "No"
                          : "No"}
                      .
                    </p>
                    {row.blockers.length > 0 && (
                      <p>
                        {es ? "Bloqueos" : "Blockers"}:{" "}
                        {row.blockers
                          .map((b) => referralReviewLabel(b, locale))
                          .join(", ")}
                      </p>
                    )}
                    <form action={reviewReferralPayout}>
                      {hidden}
                      <input type="hidden" name="event" value={row.event_id} />
                      <input
                        type="hidden"
                        name="request"
                        value={crypto.randomUUID()}
                      />
                      <label>
                        {es ? "Decisión" : "Decision"}
                        <select
                          name="state"
                          defaultValue="held"
                          disabled={!row.reviews_enabled}
                        >
                          <option value="held">
                            {es ? "Mantener retenida" : "Hold"}
                          </option>
                          <option value="rejected">
                            {es ? "Rechazar" : "Reject"}
                          </option>
                          <option value="eligible" disabled={!row.eligible}>
                            {es
                              ? "Registrar elegibilidad"
                              : "Record eligibility"}
                          </option>
                          <option
                            value="approved"
                            disabled={
                              !row.eligible || row.latest_state !== "eligible"
                            }
                          >
                            {es
                              ? "Aprobar revisión administrativa"
                              : "Approve administrative review"}
                          </option>
                        </select>
                      </label>
                      <label>
                        {es ? "Motivo" : "Reason"}
                        <textarea
                          name="reason"
                          required
                          minLength={5}
                          maxLength={2000}
                          disabled={!row.reviews_enabled}
                        />
                      </label>
                      <label>
                        {es
                          ? "Referencia documental (obligatoria al aprobar)"
                          : "Document reference (required for approval)"}
                        <input
                          name="reference"
                          maxLength={200}
                          disabled={!row.reviews_enabled}
                        />
                      </label>
                      <button disabled={!row.reviews_enabled}>
                        {es
                          ? "Guardar decisión sin desembolso"
                          : "Save decision without disbursement"}
                      </button>
                    </form>
                  </article>
                ))
              )}
            </section>
          )}
          <a href={`/${locale}/admin/referrals/export`}>
            {es
              ? "Exportar evidencia de auditoría (JSON)"
              : "Export audit evidence (JSON)"}
          </a>
          <h2>
            {es
              ? "Evidencia de facturación (últimos 50)"
              : "Billing evidence (latest 50)"}
          </h2>
          {events.error ? (
            <p role="alert">{es ? "Error de lectura" : "Read failed"}</p>
          ) : (
            events.data?.map((e) => (
              <article key={e.stripe_event_id}>
                <code>{e.stripe_event_id}</code>
                <span>
                  {referralEvidenceLabel(e.event_kind, locale)} ·{" "}
                  {es ? "Pendiente de aprobación" : "Held pending approval"}
                </span>
                <time>{e.recorded_at}</time>
              </article>
            ))
          )}
          <p>
            {es
              ? "La revisión contable y legal, las reglas financieras aprobadas y una migración separada son obligatorias antes de habilitar pagos. No hay acciones para desembolsar dinero."
              : "Accounting and legal review, approved financial rules and a separate migration are required before enabling payouts. There is no money-disbursement action."}
          </p>
        </>
      )}
    </section>
  );
}
