import "../claim-review.css";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { canModerate } from "@/lib/roles";
import { isLocale } from "@/lib/config";
import { StaffQueue, type StaffQueueItem } from "../StaffQueue";
import { setAutomaticModeration } from "../../moderation/actions";
import { RentalReviewQueue } from "../RentalReviewQueue";
import { StoryModeration } from "@/components/community/StoryModeration";

import {
  STAFF_MODERATION_QUEUES as queues,
  STAFF_QUEUE_PAGE_SIZE,
  STAFF_QUEUE_MAX_PAGE,
  parseStaffQueue,
  parseStaffQueuePage,
  staffModerationHref,
  type StaffModerationQueue as Queue,
} from "@/lib/staff-moderation-queue";

async function loadQueue(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  queue: Queue,
  offset = 0,
) {
  if (queue === "venues")
    return supabase
      .from("venues")
      .select("id,name,address,status,created_at", { count: "exact" })
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + STAFF_QUEUE_PAGE_SIZE - 1);
  if (queue === "events")
    return supabase
      .from("events")
      .select("id,title_es,title_en,status,created_at,venues(name)", {
        count: "exact",
      })
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + STAFF_QUEUE_PAGE_SIZE - 1);
  if (queue === "offers")
    return supabase
      .from("offers")
      .select("id,title_es,title_en,status,created_at,venues(name)", {
        count: "exact",
      })
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + STAFF_QUEUE_PAGE_SIZE - 1);
  if (queue === "community")
    return supabase
      .from("event_submissions")
      .select("id,title,venue_name,venue_address,state,created_at", {
        count: "exact",
      })
      .eq("state", "pending")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + STAFF_QUEUE_PAGE_SIZE - 1);
  if (queue === "rentals")
    return supabase
      .from("car_rental_companies")
      .select(
        "id,name,city,address,phone,website_url,submitted_by,created_at",
        { count: "exact" },
      )
      .eq("status", "pending_review")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + STAFF_QUEUE_PAGE_SIZE - 1);
  return supabase.rpc("staff_pending_venue_claims", { p_offset: offset });
}

export default async function StaffModerationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const queue = parseStaffQueue(query.queue);
  const { supabase, user } = await requireUser(
    locale,
    query.queue === "stories"
      ? `/${locale}/staff/moderation?queue=stories`
      : `/${locale}/staff/moderation`,
  );
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !canModerate(profile.app_role)) notFound();
  if (query.queue === "stories")
    return (
      <>
        <WorkspacePageHeader
          level={1}
          eyebrow={locale === "es" ? "Confianza" : "Trust"}
          title={locale === "es" ? "Fotos de la comunidad" : "Community photos"}
          description={
            locale === "es"
              ? "Revisa cada foto antes de su publicación. Una foto no verifica asistencia ni concede XP."
              : "Review each photo before publication. A photo does not verify attendance or award XP."
          }
        />
        <Link className="button secondary" href={`/${locale}/staff/moderation`}>
          {locale === "es" ? "Otras colas" : "Other queues"}
        </Link>
        <StoryModeration locale={locale} />
      </>
    );

  const claimPage = parseStaffQueuePage(query.page);
  const [
    { data, error: queueError, count: queueCount },
    { data: automaticMode, error: automaticModeError },
  ] = await Promise.all([
    loadQueue(supabase, queue, (claimPage - 1) * STAFF_QUEUE_PAGE_SIZE),
    supabase
      .from("automatic_moderation_settings")
      .select("enabled,changed_at")
      .eq("singleton", true)
      .maybeSingle(),
  ]);
  const total =
    queue === "claims"
      ? data?.[0]?.total_count == null
        ? null
        : Number(data[0].total_count)
      : queueCount;
  const totalKnown =
    typeof total === "number" && Number.isSafeInteger(total) && total >= 0;
  if (
    queue !== "claims" &&
    !queueError &&
    totalKnown &&
    claimPage > Math.max(1, Math.ceil(total / STAFF_QUEUE_PAGE_SIZE))
  ) {
    redirect(
      staffModerationHref(
        locale,
        queue,
        Math.max(1, Math.ceil(total / STAFF_QUEUE_PAGE_SIZE)),
        {
          updated:
            query.updated === "decision" ||
            query.updated === "review" ||
            query.updated === "automatic-mode"
              ? query.updated
              : undefined,
          error:
            query.error === "decision" ||
            query.error === "review" ||
            query.error === "automatic-mode"
              ? query.error
              : undefined,
        },
      ),
    );
  }
  // Deep-linked claims can be anywhere in the paginated queue. Never render
  // the *wrong* claim if the requested one is missing/closed.
  let claimItems = data || [];
  if (
    queue === "claims" &&
    !queueError &&
    query.claim &&
    /^[0-9a-f-]{36}$/i.test(query.claim) &&
    !claimItems.some((item: { id: string }) => item.id === query.claim)
  ) {
    const { data: focused, error: focusError } = await supabase.rpc(
      "staff_pending_venue_claim_by_id",
      {
        p_claim: query.claim,
      },
    );
    if (focusError) console.error("focused_claim_unavailable", focusError.code);
    claimItems = focused?.length ? [...focused, ...claimItems] : [];
  }
  const automaticEnabled = automaticMode?.enabled === true;
  const automaticModeKnown =
    !automaticModeError && typeof automaticMode?.enabled === "boolean";
  const canChangeAutomaticMode = profile?.app_role === "administrator";
  const es = locale === "es";
  const labels: Record<Queue, string> = {
    venues: es ? "Locales" : "Venues",
    events: es ? "Eventos" : "Events",
    offers: es ? "Ofertas" : "Offers",
    community: es ? "Comunidad" : "Community",
    claims: es ? "Reclamaciones" : "Claims",
    rentals: "AkiCoches",
  };
  const target =
    queue === "venues"
      ? "venue"
      : queue === "events"
        ? "event"
        : queue === "offers"
          ? "offer"
          : queue === "community"
            ? "submission"
            : queue === "rentals"
              ? "rental_company"
              : "venue_claim";
  return (
    <>
      <WorkspacePageHeader
        level={1}
        eyebrow={es ? "Confianza" : "Trust"}
        title={es ? "Moderación" : "Moderation"}
        description={
          es
            ? "Selecciona una cola. Solo se carga el contenido de esa tarea."
            : "Select a queue. Only that task's content is loaded."
        }
      />
      <Link
        className="button secondary"
        href={`/${locale}/staff/moderation?queue=stories`}
      >
        {es ? "Revisar fotos de check-ins" : "Review check-in photos"}
      </Link>
      {(query.updated || query.error) && (
        <p className="notice">
          {query.updated
            ? es
              ? "Decisión registrada."
              : "Decision recorded."
            : es
              ? "No se pudo registrar."
              : "Decision failed."}
        </p>
      )}
      {queue === "claims" &&
        query.updated === "decision" &&
        query.mail === "not_sent" && (
          <p className="notice" role="alert">
            {es
              ? "La decisión se ha guardado, pero no se ha confirmado el envío del email al solicitante. Comprueba la cola de notificaciones y la configuración del proveedor."
              : "The decision was saved, but the claimant email was not confirmed as sent. Check the notification queue and email provider configuration."}
          </p>
        )}
      {queue !== "claims" && (
        <section
          className="settings-row moderation-mode-card"
          aria-labelledby="moderation-mode-title"
        >
          <div>
            <p className="eyebrow">{es ? "Modo de revisión" : "Review mode"}</p>
            <h2 id="moderation-mode-title">
              {!automaticModeKnown
                ? es
                  ? "Modo de moderación no disponible"
                  : "Moderation mode unavailable"
                : automaticEnabled
                  ? es
                    ? "Moderación automática activa"
                    : "Automatic moderation is on"
                  : es
                    ? "Moderación manual activa"
                    : "Manual moderation is on"}
            </h2>
            <p>
              {!automaticModeKnown
                ? es
                  ? "No se pudo confirmar el modo actual. La cola sigue disponible, pero el modo no se puede cambiar hasta volver a cargarlo."
                  : "The current mode could not be confirmed. The queue remains available, but the mode cannot be changed until it is reloaded."
                : es
                  ? "En modo automático, el agente de catálogo revisa nuevas solicitudes de locales, eventos de negocios y eventos comunitarios. Los casos inciertos o los errores permanecen en esta cola."
                  : "In automatic mode, the catalogue agent reviews new venue, business event, and community event requests. Uncertain cases and service failures stay in this queue."}
            </p>
          </div>
          {automaticModeKnown ? (
            <form action={setAutomaticModeration}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="queue" value={queue} />
              <input type="hidden" name="queuePage" value={claimPage} />
              <input
                type="hidden"
                name="enabled"
                value={automaticEnabled ? "false" : "true"}
              />
              <button
                className={`button moderation-mode-toggle${automaticEnabled ? "active" : ""}`}
                type="submit"
                aria-pressed={automaticEnabled}
                disabled={!canChangeAutomaticMode}
                title={
                  !canChangeAutomaticMode
                    ? es
                      ? "Solo un administrador puede cambiar este modo"
                      : "Only an administrator can change this mode"
                    : undefined
                }
              >
                <span
                  aria-hidden="true"
                  className="moderation-mode-indicator"
                />
                {automaticEnabled
                  ? es
                    ? "Automático"
                    : "Automatic"
                  : es
                    ? "Manual"
                    : "Manual"}
              </button>
            </form>
          ) : (
            <Link
              className="button secondary"
              href={staffModerationHref(locale, queue, claimPage)}
            >
              {es ? "Reintentar" : "Retry"}
            </Link>
          )}
        </section>
      )}
      <nav
        className="workspace-subnav"
        aria-label={es ? "Colas de moderación" : "Moderation queues"}
      >
        {queues.map((value) => (
          <Link
            href={`/${locale}/staff/moderation?queue=${value}`}
            className={queue === value ? "active" : undefined}
            aria-current={queue === value ? "page" : undefined}
            key={value}
          >
            {labels[value]}
          </Link>
        ))}
      </nav>
      <section>
        {queue !== "claims" && <h2>{labels[queue]}</h2>}
        {queueError ? (
          <div className="notice" role="alert">
            <p>
              {es
                ? "No se pudo cargar la cola. Vuelve a intentarlo."
                : "Could not load the queue. Please try again."}
            </p>
            <Link href={staffModerationHref(locale, queue, claimPage)}>
              {es ? "Reintentar" : "Retry"}
            </Link>
          </div>
        ) : queue === "rentals" ? (
          <RentalReviewQueue
            locale={locale}
            queuePage={claimPage}
            companies={
              (data || []) as Parameters<
                typeof RentalReviewQueue
              >[0]["companies"]
            }
          />
        ) : (
          <StaffQueue
            locale={locale}
            items={claimItems as StaffQueueItem[]}
            targetType={
              target as
                | "submission"
                | "venue"
                | "event"
                | "offer"
                | "venue_claim"
            }
            claimPage={claimPage}
            queuePage={claimPage}
            selectedClaimId={query.claim}
            approve={
              queue === "community" || queue === "claims"
                ? "approved"
                : "published"
            }
          />
        )}
        {queue !== "claims" && !queueError && (
          <nav
            className="workspace-subnav"
            aria-label={es ? "Páginas de moderación" : "Moderation pages"}
          >
            {claimPage > 1 && (
              <Link href={staffModerationHref(locale, queue, claimPage - 1)}>
                {es ? "Anterior" : "Previous"}
              </Link>
            )}
            <span role="status">
              {es ? "Página" : "Page"} {claimPage} ·{" "}
              {totalKnown
                ? `${total} ${es ? "pendientes" : "pending"}`
                : es
                  ? "Total no disponible"
                  : "Total unavailable"}
            </span>
            {claimPage < STAFF_QUEUE_MAX_PAGE &&
              (totalKnown
                ? claimPage * STAFF_QUEUE_PAGE_SIZE < total
                : data?.length === STAFF_QUEUE_PAGE_SIZE) && (
                <Link href={staffModerationHref(locale, queue, claimPage + 1)}>
                  {es ? "Siguiente" : "Next"}
                </Link>
              )}
          </nav>
        )}
        {queue === "claims" && !queueError && (
          <nav
            className="workspace-subnav"
            aria-label={es ? "Páginas de reclamaciones" : "Claim pages"}
          >
            {claimPage > 1 && (
              <Link
                href={`/${locale}/staff/moderation?queue=claims&page=${claimPage - 1}`}
              >
                {es ? "Anterior" : "Previous"}
              </Link>
            )}
            <span>
              {es ? "Página" : "Page"} {claimPage}
            </span>
            {claimPage * 20 < Number(data?.[0]?.total_count || 0) && (
              <Link
                href={`/${locale}/staff/moderation?queue=claims&page=${claimPage + 1}`}
              >
                {es ? "Siguiente" : "Next"}
              </Link>
            )}
          </nav>
        )}
      </section>
    </>
  );
}
