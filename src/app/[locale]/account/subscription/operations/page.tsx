import { accountReturnPath } from "@/lib/account-return-path";
import { notFound } from "next/navigation";
import { operationToolLabel } from "@/lib/operations-billing/tool-labels";
import { isLocale } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import {
  OPERATION_PRICES,
  TOOL_KEYS,
} from "@/lib/operations-billing/operations-contract.mjs";
import {
  configureOperationsInitial,
  startOperationsCheckout,
} from "../operations-actions";
export default async function OperationsSubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    error?: string;
    workspace?: string;
    saved?: string;
    scheduled?: string;
    tier?: string;
  }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const query = await searchParams;
  const returnPath = accountReturnPath(
    locale,
    `/${locale}/account/subscription/operations?${new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => typeof entry[1] === "string"))}`,
  );
  const { supabase, user } = await requireUser(locale, returnPath);
  const { data: workspaceRows, error } = await supabase
    .from("crm_workspaces")
    .select("id,name")
    .eq("owner_profile_id", user.id)
    .in("status", ["active", "trial"])
    .order("name")
    .limit(100);
  const workspaces = error ? null : workspaceRows;
  const initialWorkspace = workspaces?.some((w) => w.id === query.workspace)
    ? query.workspace
    : !query.workspace && workspaces?.length === 1
      ? workspaces[0].id
      : null;
  const initialResult = initialWorkspace
    ? await supabase.rpc("crm_operations_initial_state", {
        p_workspace: initialWorkspace,
      })
    : { data: null, error: null };
  const initial = initialResult.error
    ? null
    : (initialResult.data as {
        initial_open?: boolean;
        tools?: string[];
      } | null);

  const scheduledResult = initialWorkspace
    ? await supabase.rpc("crm_operations_scheduled_change", {
        p_workspace: initialWorkspace,
      })
    : { data: null, error: null };
  const scheduled = scheduledResult.error
    ? null
    : (scheduledResult.data as {
        tier: string;
        effective_at: string;
        state: string;
      } | null);
  const migrationResult = initialWorkspace
    ? await supabase.rpc("crm_operations_migration_status", {
        p_workspace: initialWorkspace,
      })
    : { data: null, error: null };
  const migration = migrationResult.error
    ? null
    : (migrationResult.data as {
        tier: string;
        effective_at: string;
        state: string;
      } | null);
  const ready =
    process.env.AKIBUSINESS_OPERATIONS_CHECKOUT_READY === "true" &&
    process.env.AKIBUSINESS_OPERATIONS_BILLING_READY === "true" &&
    process.env.AKIBUSINESS_OPERATIONS_TAX_READY === "true";
  return (
    <main className="shell">
      <section className="panel stack">
        <span className="eyebrow">AkiBusiness</span>
        <h1>
          {es
            ? "Herramientas para tu ubicación"
            : "Tools for your operating location"}
        </h1>
        <p>
          {es
            ? "AkiHQ y la gestión básica de tus fichas siguen siendo gratuitos. Esta suscripción es para las herramientas operativas de una ubicación privada o pública, sin necesidad de crear un local de AkiPasa."
            : "AkiHQ and basic listing management remain free. This subscription covers operating tools for one private or public location, without requiring an AkiPasa venue."}
        </p>
        {query.error && (
          <p role="alert">
            {es
              ? "No se pudo continuar. Comprueba la selección o vuelve a intentarlo; no se ha confirmado ningún pago."
              : "Unable to continue. Check your selection or retry; no payment has been confirmed."}
          </p>
        )}
        {scheduled?.state === "scheduled" && (
          <p role="status">
            {es
              ? "Cambio confirmado para la renovación:"
              : "Confirmed change at renewal:"}{" "}
            {scheduled.tier === "basico"
              ? "Basic"
              : scheduled.tier === "standard"
                ? "Standard"
                : "Pro"}{" "}
            ·{" "}
            {new Date(scheduled.effective_at).toLocaleString(locale, {
              timeZone: "Europe/Madrid",
            })}
            .{" "}
            {es
              ? "Tus herramientas actuales se mantienen hasta esa fecha."
              : "Your current tools remain available until that date."}
          </p>
        )}
        {migration?.state === "scheduled" && migration.tier === "basico" && (
          <p role="status" data-migration-status="scheduled">
            {es
              ? "Migración programada para la renovación:"
              : "Migration scheduled at renewal:"}{" "}
            Basic ·{" "}
            {new Date(migration.effective_at).toLocaleString(locale, {
              timeZone: "Europe/Madrid",
            })}
            .{" "}
            {es
              ? "La suscripción actual se mantiene hasta esa fecha. Las herramientas operativas se activan solo tras confirmar el pago de renovación."
              : "Your current subscription remains until that date. Operating tools activate only after confirmed renewal payment."}
          </p>
        )}
        {!error && query.saved === "initial" && (
          <p role="status">
            {es
              ? "Configuración inicial guardada. Se activará tras confirmar la migración en la renovación."
              : "Initial selection saved. It activates after the migration is confirmed at renewal."}
          </p>
        )}
        {initial?.initial_open && initialWorkspace && (
          <form action={configureOperationsInitial} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="workspace" value={initialWorkspace} />
            <fieldset>
              <legend>
                {es
                  ? "Elige tus cuatro herramientas iniciales de Basic"
                  : "Choose your four initial Basic tools"}
              </legend>
              <p>
                {es
                  ? "Puedes preparar esta selección antes de la renovación. Después de activarse, los cambios siguen el límite mensual de sustituciones."
                  : "Prepare this selection before renewal. After activation, changes follow the monthly replacement allowance."}
              </p>
              {TOOL_KEYS.map((tool) => (
                <label key={tool}>
                  <input
                    name="tools"
                    type="checkbox"
                    value={tool}
                    defaultChecked={initial.tools?.includes(tool)}
                  />
                  {operationToolLabel(tool, locale)}
                </label>
              ))}
            </fieldset>
            <button className="button secondary">
              {es ? "Guardar selección inicial" : "Save initial selection"}
            </button>
          </form>
        )}
        {!ready && !error && (
          <p role="status">
            {es
              ? "La contratación está pendiente de la verificación de facturación. Tus herramientas actuales no cambian."
              : "Checkout is awaiting billing verification. Your current tools remain unchanged."}
          </p>
        )}
        {error ? (
          <div role="alert" className="stack">
            <p>
              {es
                ? "No se pudieron cargar tus ubicaciones. Vuelve a intentarlo antes de elegir un paquete."
                : "We couldn’t load your locations. Retry before choosing a package."}
            </p>
            <a className="button secondary" href={returnPath}>
              {es ? "Reintentar" : "Retry"}
            </a>
          </div>
        ) : workspaces?.length ? (
          <form action={startOperationsCheckout} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <label>
              {es ? "Ubicación" : "Location"}
              <select
                name="workspace"
                defaultValue={initialWorkspace || ""}
                required
              >
                <option value="" disabled>
                  {es ? "Selecciona tu ubicación" : "Select your location"}
                </option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {es ? "Paquete mensual" : "Monthly package"}
              <select
                name="tier"
                defaultValue={
                  query.tier && Object.hasOwn(OPERATION_PRICES, query.tier)
                    ? query.tier
                    : "basico"
                }
              >
                {Object.entries(OPERATION_PRICES).map(([tier, offer]) => (
                  <option key={tier} value={tier}>
                    {offer.name} ·{" "}
                    {(offer.amount / 100).toLocaleString(locale, {
                      style: "currency",
                      currency: "EUR",
                    })}{" "}
                    / {es ? "mes" : "month"} · {offer.tools}/12
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend>
                {es
                  ? "Elige exactamente 4 herramientas para Basic u 8 para Standard. Pro incluye las 12 automáticamente"
                  : "Choose exactly 4 tools for Basic or 8 for Standard. Pro includes all 12 automatically"}
              </legend>
              <div className="form-grid-two">
                {TOOL_KEYS.map((tool) => (
                  <label key={tool}>
                    <input type="checkbox" name="tools" value={tool} />
                    {operationToolLabel(tool, locale)}
                  </label>
                ))}
              </div>
            </fieldset>
            <p>
              {es
                ? "Si ya tienes suscripción, confirmar un paquete inferior lo programa para tu renovación pagada sin cobro inmediato. Una ampliación abre la confirmación alojada antes del pago. Las nuevas suscripciones abren el pago alojado, donde se confirman los importes e impuestos. Volver a esta página no activa herramientas."
                : "For an existing subscription, confirming a lower package schedules it for your paid renewal without an immediate charge. An upgrade opens hosted confirmation before payment. New subscriptions open hosted checkout, where amounts and taxes are confirmed. Returning alone never activates tools."}
            </p>
            <button
              className="button primary"
              disabled={!ready || Boolean(error)}
            >
              {es
                ? "Confirmar paquete y continuar"
                : "Confirm package and continue"}
            </button>
          </form>
        ) : (
          <a
            className="button secondary"
            href={`https://akihq.app/${locale}/business/locations`}
          >
            {es
              ? "Crear una ubicación privada en AkiHQ"
              : "Create a private location in AkiHQ"}
          </a>
        )}
        <a href={`https://akibusiness.com/?locale=${locale}`}>
          {es ? "Volver a AkiBusiness" : "Return to AkiBusiness"}
        </a>
      </section>
    </main>
  );
}
