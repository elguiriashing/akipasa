import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { AccountPageHeader } from "../AccountPageHeader";
import { AccountItems } from "../AccountItems";
import { AccountCollectionRefresh } from "../AccountCollectionRefresh";
import { setSavedEventReminder } from "./actions";
import { currentEventCollectionItems } from "@/lib/account-collection-catalogue";
import {
  accountCollectionPage,
  accountCollectionPageSize,
  accountCollectionQuery,
} from "@/lib/account-collection-query";

export default async function SavedEventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = (await searchParams) || {};
  const search = accountCollectionQuery(query.q);
  const page = accountCollectionPage(query.page);
  const from = (page - 1) * accountCollectionPageSize;
  const { supabase } = await requireUser(locale);
  const { data: emailPreferences, error: preferenceError } = await supabase.rpc(
    "suite_email_reminder_preferences",
    { p_event: null, p_stay: null },
  );
  const preferencesUnavailable =
    Boolean(preferenceError) ||
    typeof emailPreferences?.event_reminders !== "boolean";
  const eventReminders = emailPreferences?.event_reminders === true;
  let collectionQuery = supabase
    .from("saved_event_refs")
    .select("event_key,title,href,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("event_key", { ascending: true });
  if (search) collectionQuery = collectionQuery.ilike("title", `%${search}%`);
  const { data, error, count } = await collectionQuery.range(
    from,
    from + accountCollectionPageSize - 1,
  );
  if (!error && count && from >= count) {
    const lastPage = Math.ceil(count / accountCollectionPageSize);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (lastPage > 1) params.set("page", String(lastPage));
    redirect(
      `/${locale}/account/saved?${params.toString()}`.replace(/\?$/, ""),
    );
  }
  const items = error
    ? []
    : await currentEventCollectionItems(supabase, data || [], locale);
  const es = locale === "es";
  return (
    <>
      <AccountPageHeader
        eyebrow={es ? "Tu colección" : "Your collection"}
        title={es ? "Eventos guardados" : "Saved events"}
        description={
          es
            ? "Tus próximos planes empiezan aquí."
            : "Your next plans start here."
        }
        actions={
          <Link className="button secondary" href={`/${locale}`}>
            <Icon name="discover" size={17} />
            {es ? "Explorar eventos" : "Explore events"}
          </Link>
        }
      />
      <section
        className="account-reminder-strip"
        aria-label={es ? "Recordatorios de eventos" : "Event reminders"}
      >
        <span className="account-collection-icon" aria-hidden="true">
          <Icon name="bell" size={22} />
        </span>
        <div className="account-reminder-copy">
          <div className="account-reminder-title">
            <strong>
              {es ? "Recordatorios por email" : "Email reminders"}
            </strong>
            <span
              className={`account-reminder-status${eventReminders && !preferencesUnavailable ? "is-enabled" : ""}`}
            >
              {preferencesUnavailable
                ? es
                  ? "No disponible"
                  : "Unavailable"
                : eventReminders
                  ? es
                    ? "Activados"
                    : "On"
                  : es
                    ? "Desactivados"
                    : "Off"}
            </span>
          </div>
          <p>
            {es
              ? "Opcional · Un email unos 2 días antes de cada evento guardado con fecha confirmada."
              : "Optional · One email about 2 days before each saved event with a confirmed date."}
          </p>
          {preferencesUnavailable && (
            <p role="alert">
              {es
                ? "No se ha podido consultar tu preferencia. Reintenta antes de cambiarla."
                : "Your preference could not be loaded. Retry before changing it."}
            </p>
          )}
        </div>
        {preferencesUnavailable ? (
          <AccountCollectionRefresh locale={locale} />
        ) : (
          <form action={setSavedEventReminder}>
            <input type="hidden" name="locale" value={locale} />
            <input
              type="hidden"
              name="enabled"
              value={eventReminders ? "false" : "true"}
            />
            <button type="submit" className="button secondary">
              {eventReminders
                ? es
                  ? "Desactivar"
                  : "Disable"
                : es
                  ? "Activar emails"
                  : "Enable emails"}
            </button>
          </form>
        )}
      </section>
      {query.email === "updated" && (
        <p className="notice" role="status">
          {es
            ? "Preferencia de recordatorios actualizada."
            : "Reminder preference updated."}
        </p>
      )}
      {(query.email === "error" || query.email === "invalid") && (
        <p className="notice" role="alert">
          {es
            ? "No se ha podido actualizar la preferencia. Vuelve a intentarlo."
            : "Your reminder preference could not be updated. Please try again."}
        </p>
      )}
      {query.collection === "removed" && (
        <p className="notice" role="status">
          {es
            ? "Evento quitado de tu colección."
            : "Event removed from your collection."}
        </p>
      )}
      {query.collection === "error" && (
        <p className="notice" role="alert">
          {es
            ? "No se ha podido quitar el evento. Vuelve a intentarlo."
            : "The event could not be removed. Please try again."}
        </p>
      )}
      <AccountItems
        locale={locale}
        kind="saved"
        failed={Boolean(error)}
        total={count ?? 0}
        page={page}
        pageSize={accountCollectionPageSize}
        query={search}
        basePath={`/${locale}/account/saved`}
        items={items.map((item) => ({
          id: item.event_key,
          label: item.displayLabel,
          href: item.displayHref,
          date: item.created_at,
        }))}
        emptyTitle={
          es
            ? "Tu próxima aventura, a un toque"
            : "Your next adventure is a tap away"
        }
        emptyDescription={
          es
            ? "Guarda los eventos que te gusten para tenerlos a mano."
            : "Save events you like and find them here whenever you need them."
        }
      />
    </>
  );
}
