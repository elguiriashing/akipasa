import Link from "next/link";
import { Icon } from "@/components/Icons";
import styles from "./CommunityLanding.module.css";

export function CommunityLanding({ locale }: { locale: "en" | "es" }) {
  const es = locale === "es";
  const base = `/${locale}/community`;
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.kicker}>
          AkiPasa / {es ? "Comunidad" : "Community"}
        </span>
        <h1>
          {es
            ? "Las mejores noches se comparten."
            : "Good nights are better together."}
        </h1>
        <p>
          {es
            ? "Conoce a quienes dan vida a los planes de tu ciudad. Descubre creadores reales, comparte tus ideas y ayuda a mantener la comunidad auténtica."
            : "Meet the people making your city worth exploring. Find real creators, share ideas and help keep local discovery authentic."}
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} href={`${base}/creators`}>
            <Icon name="community" size={20} />{" "}
            {es ? "Explorar creadores" : "Explore creators"}
          </Link>
          <Link className={styles.secondary} href={`${base}?view=suggest`}>
            <Icon name="plus" size={20} />{" "}
            {es ? "Proponer un plan" : "Suggest a plan"}
          </Link>
        </div>
      </header>
      <nav
        className={styles.sections}
        aria-label={es ? "Secciones de comunidad" : "Community sections"}
      >
        <Link href={`${base}/creators`}>
          <Icon name="users" size={25} />
          <strong>{es ? "Creadores locales" : "Local creators"}</strong>
          <span>
            {es
              ? "Gente que crea experiencias de verdad."
              : "People who make real experiences happen."}
          </span>
        </Link>
        <Link href={`/${locale}/account/following`}>
          <Icon name="heart" size={25} />
          <strong>{es ? "Siguiendo" : "Following"}</strong>
          <span>
            {es
              ? "Vuelve a tus lugares favoritos."
              : "Reconnect with places you follow."}
          </span>
        </Link>
        <Link href={`${base}?view=report`}>
          <Icon name="shield" size={25} />
          <strong>{es ? "Cuidamos la comunidad" : "Keep it genuine"}</strong>
          <span>
            {es
              ? "Comunica un evento o local incorrecto."
              : "Report incorrect event or venue details."}
          </span>
        </Link>
      </nav>
      <section className={styles.friends}>
        <div>
          <span className={styles.kicker}>AkiFriends</span>
          <h2>{es ? "Planes con tus amigos" : "Make plans with friends"}</h2>
          <p>
            {es
              ? "Estamos preparando conexiones con consentimiento. No mostraremos distancias personales ni amistades inventadas."
              : "Private friend connections are being prepared. No fake friends, and nobody's precise location is exposed."}
          </p>
        </div>
        <span className={styles.pending}>
          {es ? "En desarrollo" : "In development"}
        </span>
      </section>
    </main>
  );
}
