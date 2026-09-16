/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import {
  WorkspaceShell,
  type WorkspaceItem,
} from "@/components/WorkspaceShell";

export const dynamic = "force-dynamic";

type CreatorsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export function communityCreatorItems(
  locale: string,
  counts: { suggestions?: number; reports?: number } = {},
): WorkspaceItem[] {
  const es = locale === "es";
  const base = `/${locale}/community`;
  return [
    {
      href: `${base}/creators`,
      label: es ? "Creadores" : "Creators",
      icon: "users",
    },
    {
      href: `${base}/creator`,
      label: es ? "Mi estudio" : "Creator studio",
      icon: "person",
    },
    {
      href: `${base}?view=suggest`,
      label: es ? "Crear evento" : "Create event",
      icon: "calendar",
    },
    {
      href: `${base}?view=suggestions`,
      label: es ? "Mis eventos" : "My events",
      icon: "inbox",
      count: counts.suggestions || undefined,
    },
    {
      href: `${base}?view=report`,
      label: es ? "Informar" : "Report issue",
      icon: "megaphone",
    },
    {
      href: `${base}?view=reports`,
      label: es ? "Mis avisos" : "My reports",
      icon: "activity",
      count: counts.reports || undefined,
    },
  ];
}

export async function CreatorDirectoryPage({
  params,
  searchParams,
}: CreatorsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const es = locale === "es";
  const q = (query.q || "").trim();
  const locality = (query.locality || "").trim();
  const category = (query.category || "").trim();
  const supabase = createSupabasePublicClient();

  let request = supabase
    .from("creator_profiles")
    .select(
      "profile_id,slug,display_name,headline_es,headline_en,bio_es,bio_en,locality,province,avatar_url,cover_url,verification_state,creator_categories(categories(slug,name_es,name_en)),events(id,status,event_occurrences!event_occurrences_event_id_fkey(starts_at,ends_at))",
    )
    .eq("state", "published")
    .order("updated_at", { ascending: false });

  if (q) {
    request = request.or(
      `display_name.ilike.%${q}%,headline_es.ilike.%${q}%,headline_en.ilike.%${q}%`,
    );
  }
  if (locality) request = request.ilike("locality", locality);

  const { data } = await request;
  const allCreators = (data || []) as any[];
  const categories = Array.from(
    new Map(
      allCreators
        .flatMap((creator) => creator.creator_categories || [])
        .map((item: any) => item.categories)
        .filter(Boolean)
        .map((item: any) => [item.slug, item]),
    ).values(),
  ) as any[];
  const creators = category
    ? allCreators.filter((creator) =>
        (creator.creator_categories || []).some(
          (item: any) => item.categories?.slug === category,
        ),
      )
    : allCreators;
  const now = Date.now();

  return (
    <WorkspaceShell
      title={es ? "Creadores" : "Creators"}
      eyebrow={es ? "Hecho por la comunidad" : "Community made"}
      description={
        es
          ? "Conoce a las personas detrás de los planes, experiencias y encuentros de AkiPasa."
          : "Meet the people behind AkiPasa’s events, experiences and local gatherings."
      }
      navigationTitle={es ? "Comunidad" : "Community"}
      homeHref={`/${locale}/community`}
      items={communityCreatorItems(locale)}
    >
      <div className="creator-directory creator-directory-v2">
        <section className="creator-discovery-intro">
          <div>
            <span className="eyebrow">
              {es ? "Gente local, ideas reales" : "Local people, real ideas"}
            </span>
            <h2>
              {es
                ? "Encuentra tu próxima comunidad."
                : "Find your next community."}
            </h2>
            <p>
              {es
                ? "Artistas, anfitriones, clubes y organizadores. Descubre quién está creando algo cerca de ti."
                : "Artists, hosts, clubs and organisers. Discover who is creating something near you."}
            </p>
          </div>
          <Link
            className="button button-strong"
            href={`/${locale}/community/creator`}
          >
            {es ? "Crear mi página" : "Build my page"}
          </Link>
        </section>

        <form className="creator-search creator-search-v2">
          <label className="creator-search-main">
            <span>{es ? "Buscar" : "Search"}</span>
            <input
              name="q"
              defaultValue={q}
              placeholder={
                es
                  ? "Nombre, actividad o categoría"
                  : "Name, activity or category"
              }
            />
          </label>
          <label>
            <span>{es ? "Zona" : "Area"}</span>
            <input
              name="locality"
              defaultValue={locality}
              placeholder={es ? "Cualquier zona" : "Any area"}
            />
          </label>
          <button className="button" type="submit">
            {es ? "Explorar" : "Explore"}
          </button>
        </form>

        {categories.length > 0 && (
          <nav
            className="creator-category-nav"
            aria-label={es ? "Categorías de creadores" : "Creator categories"}
          >
            <Link
              className={!category ? "active" : ""}
              href={`/${locale}/community/creators`}
            >
              {es ? "Todos" : "All"}
            </Link>
            {categories.map((item) => (
              <Link
                className={category === item.slug ? "active" : ""}
                key={item.slug}
                href={`/${locale}/community/creators?category=${encodeURIComponent(item.slug)}`}
              >
                {es ? item.name_es : item.name_en || item.name_es}
              </Link>
            ))}
          </nav>
        )}

        {!q && !locality && !category && categories.length > 0 ? (
          <div className="creator-collections">
            {categories.map((item) => {
              const collection = allCreators.filter((creator) =>
                (creator.creator_categories || []).some(
                  (entry: any) => entry.categories?.slug === item.slug,
                ),
              );
              if (!collection.length) return null;
              return (
                <section className="creator-collection" key={item.slug}>
                  <header>
                    <div>
                      <span>{es ? "Colección" : "Collection"}</span>
                      <h2>
                        {es ? item.name_es : item.name_en || item.name_es}
                      </h2>
                    </div>
                    <Link
                      href={`/${locale}/community/creators?category=${encodeURIComponent(item.slug)}`}
                    >
                      {es ? "Ver todos" : "View all"}{" "}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </header>
                  <div className="creator-card-rail">
                    {collection.map((creator: any) => (
                      <CreatorCard
                        creator={creator}
                        locale={locale}
                        now={now}
                        key={creator.profile_id}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <section className="creator-results">
            <header className="creator-results-heading">
              <div>
                <span className="eyebrow">{es ? "Resultados" : "Results"}</span>
                <h2>
                  {creators.length
                    ? es
                      ? `${creators.length} creadores para descubrir`
                      : `${creators.length} creators to discover`
                    : es
                      ? "No encontramos coincidencias"
                      : "No matches yet"}
                </h2>
              </div>
              {(q || locality || category) && (
                <Link href={`/${locale}/community/creators`}>
                  {es ? "Limpiar filtros" : "Clear filters"}
                </Link>
              )}
            </header>
            {creators.length > 0 ? (
              <div className="creator-card-grid">
                {creators.map((creator: any) => (
                  <CreatorCard
                    creator={creator}
                    locale={locale}
                    now={now}
                    key={creator.profile_id}
                  />
                ))}
              </div>
            ) : (
              <div className="creator-empty">
                <strong>
                  {es ? "Todavía hay sitio para ti." : "There is room for you."}
                </strong>
                <p>
                  {es
                    ? "Sé la primera persona en publicar una página en esta categoría."
                    : "Be the first person to publish a page in this category."}
                </p>
                <Link className="button" href={`/${locale}/community/creator`}>
                  {es ? "Crear mi página" : "Create my page"}
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
    </WorkspaceShell>
  );
}

function CreatorCard({
  creator,
  locale,
  now,
}: {
  creator: any;
  locale: string;
  now: number;
}) {
  const es = locale === "es";
  const occurrences = (creator.events || []).flatMap(
    (event: any) => event.event_occurrences || [],
  );
  const upcoming = occurrences.filter(
    (occurrence: any) => new Date(occurrence.ends_at).getTime() >= now,
  ).length;
  const past = occurrences.length - upcoming;
  const categories = (creator.creator_categories || [])
    .map((item: any) => item.categories)
    .filter(Boolean);
  const description =
    (es ? creator.headline_es : creator.headline_en) ||
    creator.headline_es ||
    (es ? creator.bio_es : creator.bio_en) ||
    creator.bio_es;

  return (
    <Link
      className="creator-card creator-card-v2"
      href={`/${locale}/community/creators/${creator.slug}`}
    >
      <div className="creator-card-media">
        {creator.cover_url ? (
          <img src={creator.cover_url} alt="" />
        ) : creator.avatar_url ? (
          <img
            className="creator-card-avatar-backdrop"
            src={creator.avatar_url}
            alt=""
          />
        ) : (
          <span className="creator-card-monogram" aria-hidden="true">
            {creator.display_name.slice(0, 1)}
          </span>
        )}
        <span className="creator-card-gradient" aria-hidden="true" />
        <span className="creator-avatar">
          {creator.avatar_url ? (
            <img src={creator.avatar_url} alt="" />
          ) : (
            creator.display_name.slice(0, 1)
          )}
        </span>
        {creator.verification_state === "verified" && (
          <span
            className="creator-verified"
            title={es ? "Creador verificado" : "Verified creator"}
          >
            <span aria-hidden="true">✓</span>
            {es ? "Verificado" : "Verified"}
          </span>
        )}
      </div>
      <div className="creator-card-body">
        <div className="creator-card-title">
          <h3>{creator.display_name}</h3>
          {(creator.locality || creator.province) && (
            <span>
              {[creator.locality, creator.province].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
        <p>{description}</p>
        <div className="creator-tags">
          {categories.slice(0, 3).map((item: any) => (
            <span key={item.slug}>
              {es ? item.name_es : item.name_en || item.name_es}
            </span>
          ))}
        </div>
        <div className="creator-stats">
          <span>
            <strong>{upcoming}</strong> {es ? "próximos" : "upcoming"}
          </span>
          <span>
            <strong>{past}</strong> {es ? "anteriores" : "past"}
          </span>
          <span className="creator-card-open" aria-hidden="true">
            ↗
          </span>
        </div>
      </div>
    </Link>
  );
}
