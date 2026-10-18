import Link from "next/link";
import { headers } from "next/headers";
import { stayLocale } from "@/lib/akiduermo-i18n";
import { StayAppShell } from "@/components/StayAppShell";
import styles from "./membership.module.css";

export const metadata = {
  title: "Membership · AkiDuermo",
  description: "AkiDuermo business and AkiSuite membership options",
};

export default async function StayMembershipPage() {
  const locale = stayLocale((await headers()).get("x-akipasa-locale"));
  const es = locale === "es";
  const plans = [
    {
      name: "AkiDuermo Premium for Business",
      kind: es ? "Para alojamientos" : "For accommodation hosts",
      description: es
        ? "Destaca tus propiedades y mejora tu presencia."
        : "Give your properties stronger visibility and promotion.",
      href: "https://akibusiness.com/",
      hue: "mint",
    },
    {
      name: "AkiBusiness Standard",
      kind: es ? "Operaciones" : "Operations",
      description: es
        ? "Gestiona el trabajo diario de tu empresa."
        : "Manage daily work across your business.",
      href: "https://akibusiness.com/",
      hue: "gold",
    },
    {
      name: "AkiBusiness Pro",
      kind: es ? "Herramientas avanzadas" : "Advanced tools",
      description: es
        ? "Herramientas avanzadas para tus equipos y operaciones."
        : "Advanced tools for teams and operations.",
      href: "https://akibusiness.com/",
      hue: "gold",
    },
    {
      name: "AkiEnterprise",
      kind: es ? "AkiSuite completo" : "Complete AkiSuite",
      description: es
        ? "La plataforma completa para tu organización."
        : "The complete platform for your organisation.",
      href: "https://akibusiness.com/",
      hue: "enterprise",
    },
  ] as const;
  return (
    <StayAppShell locale={locale}>
      <div className={styles.page}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>AKIDUERMO / AKISUITE</span>
          <h1>
            {es
              ? "Tu alojamiento. Más posibilidades."
              : "Your property. More possibilities."}
          </h1>
          <p>
            {es
              ? "Descubre los planes empresariales de AkiDuermo. El Premium personal seguirá oculto hasta alcanzar el objetivo de puntos."
              : "Explore AkiDuermo business plans. Personal Premium stays hidden until our adoption-points goal is reached."}
          </p>
        </header>
        <section
          className={styles.grid}
          aria-label={es ? "Planes disponibles" : "Available plans"}
        >
          {plans.map((plan) => (
            <article
              className={styles.card}
              data-hue={plan.hue}
              key={plan.name}
            >
              <span className={styles.eyebrow}>{plan.kind}</span>
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
              <Link className={styles.action} href={plan.href}>
                {es ? "Explorar opciones" : "Explore options"}{" "}
                <span aria-hidden="true">↗</span>
              </Link>
            </article>
          ))}
        </section>
        <p className={styles.note}>
          {es
            ? "Esta página no inicia cargos. Consulta los precios y la disponibilidad antes de contratar."
            : "No charges are initiated here. Review verified prices and availability before subscribing."}
        </p>
      </div>
    </StayAppShell>
  );
}
