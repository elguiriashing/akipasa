/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { communityCreatorItems } from "./CreatorDirectoryPage";
import { submitCreatorReview } from "@/app/[locale]/community/creator-actions";

export const dynamic = "force-dynamic";

type CreatorPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function CommunityCreatorPage({ params }: CreatorPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const supabase = createSupabasePublicClient();
  const { data: creator } = await supabase
    .from("creator_profiles")
    .select(
      "profile_id,slug,display_name,headline_es,headline_en,bio_es,bio_en,locality,province,avatar_url,cover_url,website_url,instagram_url,youtube_url,verification_state,updated_at,creator_categories(categories(slug,name_es,name_en)),creator_reviews(rating,body,created_at),events(id,slug,title_es,title_en,description_es,description_en,status,event_occurrences!event_occurrences_event_id_fkey(starts_at,ends_at),venues(name,venue_media(storage_path,alt_es,alt_en)))",
    )
    .eq("slug", slug)
    .eq("state", "published")
    .maybeSingle();

  if (!creator) notFound();
  const c = creator as any;
  const paths = Array.from(
    new Set(
      (c.events || [])
        .flatMap((event: any) => event.venues?.venue_media || [])
        .map((media: any) => media.storage_path)
        .filter(Boolean),
    ),
  ) as string[];
  const signedUrls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from("event-media")
      .createSignedUrls(paths, 3600);
    (signed || []).forEach((item) => {
      if (item.path && item.signedUrl)
        signedUrls.set(item.path, item.signedUrl);
    });
  }

  const now = Date.now();
  const events = (c.events || [])
    .filter((event: any) => event.status === "published")
    .map((event: any) => {
      const occurrences = (event.event_occurrences || [])
        .map((occurrence: any) => ({
          startsAt: new Date(occurrence.starts_at).getTime(),
          endsAt: new Date(occurrence.ends_at).getTime(),
        }))
        .sort((a: any, b: any) => a.startsAt - b.startsAt);
      const nextOccurrence =
        occurrences.find((occurrence: any) => occurrence.endsAt >= now) ||
        occurrences.at(-1);
      const media = event.venues?.venue_media?.[0];
      return {
        ...event,
        next: nextOccurrence?.startsAt,
        last: occurrences.at(-1)?.endsAt,
        venueName: event.venues?.name,
        image: media?.storage_path
          ? signedUrls.get(media.storage_path)
          : undefined,
        imageAlt: media
          ? (es ? media.alt_es : media.alt_en) || media.alt_es
          : "",
      };
    })
    .sort((a: any, b: any) => (a.next || 0) - (b.next || 0));

  const upcoming = events.filter((event: any) => (event.last || 0) >= now);
  const past = events.filter((event: any) => (event.last || 0) < now).reverse();
  const reviews = c.creator_reviews || [];
  const rating = reviews.length
    ? (
        reviews.reduce((sum: number, review: any) => sum + review.rating, 0) /
        reviews.length
      ).toFixed(1)
    : null;
  const bio = (es ? c.bio_es : c.bio_en) || c.bio_es;
  const headline =
    (es ? c.headline_es : c.headline_en) ||
    c.headline_es ||
    (es ? "Creador local" : "Local creator");
  const categories = (c.creator_categories || [])
    .map((item: any) => item.categories)
    .filter(Boolean);
  const gallery = Array.from(
    new Map(
      [
        ...(c.cover_url ? [{ url: c.cover_url, alt: c.display_name }] : []),
        ...events
          .filter((event: any) => event.image)
          .map((event: any) => ({
            url: event.image,
            alt: event.imageAlt || event.title_es,
          })),
      ].map((item: any) => [item.url, item]),
    ).values(),
  ) as Array<{ url: string; alt: string }>;

  return (
    <WorkspaceShell
      title={c.display_name}
      eyebrow={es ? "Página de creador" : "Creator page"}
      description={headline}
      navigationTitle={es ? "Comunidad" : "Community"}
      homeHref={`/${locale}/community`}
      items={communityCreatorItems(locale)}
    >
      <div className="creator-profile creator-profile-v2">
        <section
          className={`creator-cover ${c.cover_url ? "has-image" : ""}`}
          style={
            c.cover_url
              ? {
                  backgroundImage: `linear-gradient(180deg,rgba(5,18,18,.08),rgba(5,18,18,.92)),url("${c.cover_url}")`,
                }
              : undefined
          }
        >
          <div className="creator-profile-identity">
            <span className="creator-profile-avatar">
              {c.avatar_url ? (
                <img src={c.avatar_url} alt={c.display_name} />
              ) : (
                c.display_name.slice(0, 1)
              )}
            </span>
            <div className="creator-profile-title">
              <div className="creator-profile-kicker">
                <span>
                  {categories[0]
                    ? es
                      ? categories[0].name_es
                      : categories[0].name_en || categories[0].name_es
                    : headline}
                </span>
                {c.verification_state === "verified" && (
                  <span className="creator-verified">
                    <span aria-hidden="true">✓</span>
                    {es ? "Verificado" : "Verified"}
                  </span>
                )}
              </div>
              <h1>{c.display_name}</h1>
              <p>{headline}</p>
              {(c.locality || c.province) && (
                <span className="creator-location">
                  <span aria-hidden="true">⌖</span>{" "}
                  {[c.locality, c.province].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="creator-profile-content-v2">
          <section className="creator-profile-intro">
            <div className="creator-profile-main">
              <span className="eyebrow">{es ? "Sobre mí" : "About"}</span>
              <h2>
                {es ? `Conoce a ${c.display_name}` : `Meet ${c.display_name}`}
              </h2>
              <p>{bio}</p>
              <div className="creator-tags">
                {categories.map((item: any) => (
                  <span key={item.slug}>
                    {es ? item.name_es : item.name_en || item.name_es}
                  </span>
                ))}
              </div>
            </div>
            <aside className="creator-profile-summary">
              <div>
                <strong>{upcoming.length}</strong>
                <span>{es ? "Próximos" : "Upcoming"}</span>
              </div>
              <div>
                <strong>{past.length}</strong>
                <span>{es ? "Realizados" : "Hosted"}</span>
              </div>
              <div>
                <strong>{rating || "—"}</strong>
                <span>{es ? "Valoración" : "Rating"}</span>
              </div>
            </aside>
          </section>

          <EventSection
            title={es ? "Próximamente" : "Happening next"}
            eyebrow={es ? "No te lo pierdas" : "Do not miss it"}
            empty={
              es
                ? "No hay próximos eventos publicados todavía."
                : "No upcoming events are published yet."
            }
            events={upcoming}
            locale={locale}
          />

          {past.length > 0 && (
            <EventSection
              title={es ? "Del archivo" : "From the archive"}
              eyebrow={es ? "Eventos anteriores" : "Past events"}
              events={past}
              locale={locale}
            />
          )}

          {gallery.length > 0 && (
            <section className="creator-gallery-section">
              <header>
                <span className="eyebrow">{es ? "Momentos" : "Moments"}</span>
                <h2>{es ? "Galería" : "Gallery"}</h2>
              </header>
              <div className="creator-gallery">
                {gallery.slice(0, 5).map((item, index) => (
                  <figure
                    key={item.url}
                    className={index === 0 ? "featured" : ""}
                  >
                    <img src={item.url} alt={item.alt} loading="lazy" />
                  </figure>
                ))}
              </div>
            </section>
          )}

          {reviews.length > 0 && (
            <section className="creator-reviews-section">
              <header>
                <span className="eyebrow">
                  {es ? "La comunidad dice" : "From the community"}
                </span>
                <h2>
                  {es ? "Experiencias compartidas" : "Shared experiences"}
                </h2>
              </header>
              <div className="creator-review-grid">
                {reviews.map((review: any, index: number) => (
                  <article key={index}>
                    <div aria-label={`${review.rating} / 5`}>
                      {"★".repeat(review.rating)}
                      <span>{"★".repeat(5 - review.rating)}</span>
                    </div>
                    <p>{review.body}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="creator-faq-section">
            <header>
              <span className="eyebrow">
                {es ? "Antes de venir" : "Before you join"}
              </span>
              <h2>
                {es ? "Preguntas frecuentes" : "Frequently asked questions"}
              </h2>
            </header>
            <div className="creator-faq-list">
              <details>
                <summary>
                  {es
                    ? "¿Qué tipo de experiencias organiza?"
                    : "What kind of experiences do they host?"}
                </summary>
                <p>
                  {headline}.{" "}
                  {categories.length
                    ? es
                      ? `Su página está conectada con ${categories.map((item: any) => item.name_es).join(", ")}.`
                      : `Their page is connected with ${categories.map((item: any) => item.name_en || item.name_es).join(", ")}.`
                    : ""}
                </p>
              </details>
              <details>
                <summary>
                  {es
                    ? "¿Dónde puedo ver las próximas fechas?"
                    : "Where can I find upcoming dates?"}
                </summary>
                <p>
                  {es
                    ? "Las fechas publicadas aparecen arriba y cada tarjeta abre todos los detalles, ubicación y opciones de reserva."
                    : "Published dates appear above. Open any event card for full details, location and booking options."}
                </p>
              </details>
              <details>
                <summary>
                  {es
                    ? "¿Cómo puedo contactar con este creador?"
                    : "How can I contact this creator?"}
                </summary>
                <p>
                  {c.website_url || c.instagram_url || c.youtube_url
                    ? es
                      ? "Usa uno de los enlaces oficiales de contacto que aparecen al final de esta página."
                      : "Use one of the official contact links at the end of this page."
                    : es
                      ? "Abre uno de sus eventos para consultar las opciones de contacto o reserva disponibles."
                      : "Open one of their events to see the available contact or booking options."}
                </p>
              </details>
            </div>
          </section>

          <section className="creator-profile-footer-card">
            <div className="creator-contact-card">
              <span className="eyebrow">
                {es ? "Hablemos" : "Get in touch"}
              </span>
              <h2>
                {es
                  ? `Conecta con ${c.display_name}`
                  : `Connect with ${c.display_name}`}
              </h2>
              <p>
                {es
                  ? "Consulta sus canales oficiales o descubre su próximo evento."
                  : "Visit their official channels or discover their next event."}
              </p>
              <div className="creator-socials">
                {c.website_url && (
                  <a href={c.website_url} target="_blank" rel="noreferrer">
                    Website ↗
                  </a>
                )}
                {c.instagram_url && (
                  <a href={c.instagram_url} target="_blank" rel="noreferrer">
                    Instagram ↗
                  </a>
                )}
                {c.youtube_url && (
                  <a href={c.youtube_url} target="_blank" rel="noreferrer">
                    YouTube ↗
                  </a>
                )}
                {!c.website_url &&
                  !c.instagram_url &&
                  !c.youtube_url &&
                  upcoming[0] && (
                    <Link href={`/${locale}/events/${upcoming[0].slug}`}>
                      {es ? "Ver próximo evento" : "View next event"} →
                    </Link>
                  )}
              </div>
            </div>
            <div
              className={`creator-community-stamp ${c.verification_state === "verified" ? "is-verified" : ""}`}
            >
              <span aria-hidden="true">A</span>
              <strong>
                {c.verification_state === "verified"
                  ? es
                    ? "Creador verificado"
                    : "Verified creator"
                  : es
                    ? "Miembro de la comunidad"
                    : "Community member"}
              </strong>
              <small>AkiPasa · {new Date(c.updated_at).getFullYear()}</small>
            </div>
          </section>

          <details className="creator-review-form">
            <summary>
              {es ? "Compartir una valoración" : "Share a review"}
            </summary>
            <form action={submitCreatorReview} className="stack">
              <input type="hidden" name="locale" value={locale} />
              <input
                type="hidden"
                name="creatorProfileId"
                value={c.profile_id}
              />
              <input type="hidden" name="creatorSlug" value={c.slug} />
              <label>
                {es ? "Valoración" : "Rating"}
                <select name="rating" defaultValue="5">
                  <option value="5">5 / 5</option>
                  <option value="4">4 / 5</option>
                  <option value="3">3 / 5</option>
                  <option value="2">2 / 5</option>
                  <option value="1">1 / 5</option>
                </select>
              </label>
              <label>
                {es ? "Tu experiencia" : "Your experience"}
                <textarea
                  name="body"
                  required
                  minLength={20}
                  maxLength={1200}
                />
              </label>
              <button className="button secondary" type="submit">
                {es ? "Enviar valoración" : "Submit review"}
              </button>
              <p>
                {es
                  ? "Las valoraciones se revisan antes de publicarse."
                  : "Reviews are moderated before publication."}
              </p>
            </form>
          </details>

          <Link className="back-link" href={`/${locale}/community/creators`}>
            ← {es ? "Todos los creadores" : "All creators"}
          </Link>
        </div>
      </div>
    </WorkspaceShell>
  );
}

function EventSection({
  title,
  eyebrow,
  empty,
  events,
  locale,
}: {
  title: string;
  eyebrow: string;
  empty?: string;
  events: any[];
  locale: string;
}) {
  return (
    <section className="creator-events creator-events-v2">
      <header>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {events.length > 0 && <span>{events.length}</span>}
      </header>
      {events.length ? (
        <div className="creator-event-grid">
          {events.map((event) => (
            <Link key={event.id} href={`/${locale}/events/${event.slug}`}>
              <div className="creator-event-media">
                {event.image ? (
                  <img
                    src={event.image}
                    alt={event.imageAlt || ""}
                    loading="lazy"
                  />
                ) : (
                  <span aria-hidden="true">{event.title_es.slice(0, 1)}</span>
                )}
                <span>
                  {event.next
                    ? new Intl.DateTimeFormat(locale, {
                        day: "numeric",
                        month: "short",
                      }).format(new Date(event.next))
                    : ""}
                </span>
              </div>
              <div>
                <h3>
                  {locale === "es"
                    ? event.title_es
                    : event.title_en || event.title_es}
                </h3>
                {event.venueName && (
                  <span className="creator-event-venue">{event.venueName}</span>
                )}
                <p>
                  {locale === "es"
                    ? event.description_es
                    : event.description_en || event.description_es}
                </p>
                <strong>
                  {locale === "es" ? "Ver evento" : "View event"} →
                </strong>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="creator-events-empty">{empty}</p>
      )}
    </section>
  );
}
