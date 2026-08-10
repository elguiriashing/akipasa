import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { buildCalendar, type CalendarEntry } from "@/lib/calendar";
import { config, isLocale } from "@/lib/config";
import { translated } from "@/lib/domain";
import { repository } from "@/lib/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(locale);
  const [{ data: premium }, { data: saved }] = await Promise.all([
    supabase.rpc("has_active_entitlement", {
      p_profile: user.id,
      p_plan: "premium",
    }),
    supabase
      .from("saved_event_refs")
      .select("href")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (!premium)
    return new Response("Premium membership required", { status: 403 });

  const entries = (
    await Promise.all(
      (saved || []).map(async ({ href }): Promise<CalendarEntry | null> => {
        const slug = href.match(/\/events\/([^/?#]+)/)?.[1];
        if (!slug) return null;
        const event = await repository.eventBySlug(slug);
        if (!event) return null;
        const occurrence = event.occurrences.find(
          (item) =>
            item.status !== "cancelled" && new Date(item.endsAt) > new Date(),
        );
        if (!occurrence) return null;
        const venue = await repository.venueById(event.venueId);
        if (!venue) return null;
        return {
          uid: `${occurrence.id}@akipasa.com`,
          title: translated(event.title, locale),
          description: translated(event.description, locale),
          location: `${venue.name}, ${venue.address}`,
          startsAt: occurrence.startsAt,
          endsAt: occurrence.endsAt,
          url: `${config.siteUrl}/${locale}/events/${event.slug}`,
        };
      }),
    )
  ).filter((entry): entry is CalendarEntry => Boolean(entry));

  return new Response(buildCalendar(entries), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="akipasa-saved-events.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
