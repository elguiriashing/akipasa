import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { cityDiscoveryHref, majorCities } from "@/lib/city-discovery";
import styles from "./CommunityLanding.module.css";
import { CityStories } from "./CityStories";
import { CheckinStories } from "./CheckinStories";

export function CommunityLanding({
  locale,
  initialCenter,
  areaLabel,
}: {
  locale: "en" | "es";
  initialCenter?: { latitude: number; longitude: number };
  areaLabel?: string;
}) {
  const es = locale === "es";
  const base = `/${locale}/community`;
  const cities = ["malaga", "marbella"].flatMap((key) => {
    const city = majorCities.find((entry) => entry.key === key);
    return city ? [city] : [];
  });
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <h1>{es ? "Comunidad" : "Community"}</h1>
        <span>
          <Icon name="map" size={14} /> Costa del Sol
        </span>
      </header>
      <nav
        className={styles.tabs}
        aria-label={es ? "Secciones de comunidad" : "Community sections"}
      >
        <Link href={base} aria-current="page">
          {es ? "Descubrir" : "Discover"}
        </Link>
        <Link href={`/${locale}/account/following`}>
          {es ? "Siguiendo" : "Following"}
        </Link>
        <Link href="#city-stories">{es ? "Cerca de ti" : "Nearby"}</Link>
      </nav>
      <div id="city-stories" tabIndex={-1}>
        <CityStories
          locale={locale}
          initialCenter={initialCenter}
          areaLabel={areaLabel}
          leadingContent={
            <>
              <CheckinStories locale={locale} variant="story" />
              <Link className={styles.storyShortcut} href={`${base}/creators`}>
                <span>
                  <Icon name="users" size={25} />
                </span>
                <b>{es ? "Creadores" : "Creators"}</b>
              </Link>
            </>
          }
        />
      </div>
      <article className={styles.feature}>
        <div className={styles.byline}>
          <span className={styles.editorIcon}>
            <Icon name="community" size={19} />
          </span>
          <div>
            <strong>AkiPasa</strong>
            <span>
              {es
                ? "Miradas locales · Costa del Sol"
                : "Local perspectives · Costa del Sol"}
            </span>
          </div>
          <span className={styles.edition}>{es ? "Explora" : "Explore"}</span>
        </div>
        <div className={styles.photo}>
          <Image
            src="/images/akipasa/nightlife-editorial.webp"
            alt={
              es
                ? "Ilustración de una terraza al atardecer en la costa"
                : "Illustration of a coastal terrace at sunset"
            }
            fill
            sizes="(max-width: 700px) 100vw, 900px"
            priority
            unoptimized
          />
          <div className={styles.photoCaption}>
            <span>
              {es
                ? "Tu próximo plan empieza aquí"
                : "Your next plan starts here"}
            </span>
            <h2>
              {es
                ? "Los buenos planes se comparten."
                : "Good plans are better together."}
            </h2>
            <Link href={`${base}/creators`}>
              {es ? "Explorar creadores" : "Explore creators"}
              <Icon name="arrow-right" size={17} />
            </Link>
          </div>
        </div>
        <div className={styles.featureFoot}>
          <p>
            {es
              ? "Descubre quién crea experiencias en tu ciudad, encuentra tus lugares y aporta tus ideas."
              : "Discover who creates local experiences, find your places and bring your own ideas."}
          </p>
          <span className={styles.artNote}>
            {es
              ? "Inspiración editorial · ilustración, no un local ni un evento anunciado"
              : "Editorial inspiration · illustration, not an advertised venue or event"}
          </span>
        </div>
      </article>
      <section
        className={styles.explore}
        aria-labelledby="community-places-heading"
      >
        <header>
          <h2 id="community-places-heading">
            {es ? "Encuentra tu lugar" : "Find your place"}
          </h2>
          <Link href={`/${locale}/map`}>
            {es ? "Ver mapa" : "View map"}
            <Icon name="arrow-right" size={15} />
          </Link>
        </header>
        <div className={styles.cityGrid}>
          {cities.map((city) => (
            <Link key={city.key} href={cityDiscoveryHref(city, locale)}>
              <div>
                <Image
                  src={city.photo.src}
                  alt={city.photo.landmark}
                  fill
                  sizes="(max-width: 700px) 48vw, 400px"
                  unoptimized
                />
                <span>
                  <Icon name="arrow-right" size={17} />
                </span>
              </div>
              <strong>{city[locale]}</strong>
              <small>{es ? "Explorar lugares" : "Explore places"}</small>
            </Link>
          ))}
        </div>
        <Link className={styles.photoCredits} href={`/${locale}/photo-credits`}>
          {es ? "Créditos de las fotos de ciudades" : "City photo credits"} ↗
        </Link>
      </section>
      <nav
        className={styles.actions}
        aria-label={es ? "Tu comunidad" : "Your community"}
      >
        <Link href={`${base}?view=suggest`}>
          <span>
            <Icon name="plus" size={21} />
          </span>
          <div>
            <strong>{es ? "Proponer un plan" : "Suggest a plan"}</strong>
            <small>
              {es
                ? "Propón una experiencia para que la comunidad la descubra."
                : "Suggest an experience for the community to discover."}
            </small>
          </div>
          <Icon name="arrow-right" size={18} />
        </Link>
        <Link href={`/${locale}/account/following`}>
          <span>
            <Icon name="heart" size={21} />
          </span>
          <div>
            <strong>
              {es ? "Tus lugares, a mano" : "Keep your places close"}
            </strong>
            <small>
              {es
                ? "Vuelve a los negocios que sigues."
                : "Return to the places you follow."}
            </small>
          </div>
          <Icon name="arrow-right" size={18} />
        </Link>
        <Link href={`${base}?view=report`}>
          <span>
            <Icon name="shield" size={21} />
          </span>
          <div>
            <strong>{es ? "Cuidamos la comunidad" : "Keep it genuine"}</strong>
            <small>
              {es
                ? "Comunica un dato incorrecto."
                : "Report incorrect venue or event details."}
            </small>
          </div>
          <Icon name="arrow-right" size={18} />
        </Link>
      </nav>
      <aside className={styles.friends}>
        <Icon name="users" size={20} />
        <p>
          <strong>{es ? "Planes con amigos" : "Plans with friends"}</strong>
          <span>
            {es
              ? "Las conexiones privadas entre amigos están en desarrollo. Por ahora, puedes seguir tus lugares favoritos."
              : "Private friend connections are in development. For now, you can follow your favourite places."}
          </span>
        </p>
        <span className={styles.pending}>
          {es ? "En desarrollo" : "In development"}
        </span>
      </aside>
      <Link className={styles.roadmapLink} href={`/${locale}/roadmap`}>
        {es ? "Consulta nuestro plan de lanzamiento" : "See our launch roadmap"}
        <Icon name="arrow-right" size={18} />
      </Link>
    </main>
  );
}
