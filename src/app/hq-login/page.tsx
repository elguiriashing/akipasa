import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./gateway.module.css";

export const metadata: Metadata = {
  title: "Business access | AkiHQ",
  description: "Secure business management is available through AkiHQ.",
  robots: { index: false, follow: false },
};

export default async function HQLogin({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const locale = (await searchParams).lang === "en" ? "en" : "es";
  const es = locale === "es";
  return (
    <main
      className={styles.gateway}
      style={{ "--gateway-accent": "#f26b1d" } as CSSProperties}
    >
      <section className={styles.shell}>
        <div className={styles.content}>
          <div className={styles.brand}>
            <Image src="/brand/v3/pasa.svg" alt="" width={52} height={52} />
            <span>
              AkiPasa <span aria-hidden="true">/</span> AkiHQ
            </span>
          </div>
          <p className={styles.kicker}>
            {es
              ? "TU NEGOCIO, SIN COMPLICACIONES"
              : "YOUR BUSINESS, WITHOUT THE CLUTTER"}
          </p>
          <h1 className={styles.title}>
            {es ? "Gestiona tu local desde AkiHQ" : "Manage your venue on AkiHQ"}
          </h1>
          <p className={styles.description}>
            {es
              ? "Mantén tus fichas de AkiPasa, eventos, solicitudes y permisos del equipo en tu espacio para negocios."
              : "Keep your AkiPasa listings, events, requests and team permissions together in your business workspace."}
          </p>
          <div className={styles.actions}>
            <a
              className={styles.primary}
              href={`https://akihq.app/login?lang=${locale}`}
            >
              {es ? "Entrar a AkiHQ" : "Sign in to AkiHQ"}
            </a>
            <Link className={styles.secondary} href={`/${locale}`}>
              {es ? "Volver a explorar" : "Back to discovery"}
            </Link>
          </div>
          <p className={styles.note}>
            {es
              ? "AkiHQ gestiona tus fichas y ubicaciones. AkiBusiness es otro producto, independiente, para operaciones empresariales."
              : "AkiHQ manages your listings and locations. AkiBusiness is a separate, independent operations product."}{" "}
            <a href="https://akibusiness.com">
              {es ? "Conocer AkiBusiness" : "About AkiBusiness"}
            </a>
          </p>
        </div>
        <aside className={styles.guide} aria-labelledby="hq-how-it-works">
          <p className={styles.guideKicker}>
            {es ? "TU SIGUIENTE PASO" : "YOUR NEXT STEP"}
          </p>
          <h2 id="hq-how-it-works">
            {es ? "Tu espacio para negocios" : "Your business workspace"}
          </h2>
          <p className={styles.guideIntro}>
            {es
              ? "Accede solo a los locales y herramientas para los que tengas permiso."
              : "Access only the venues and tools you have permission to manage."}
          </p>
          <ol className={styles.steps}>
            <li>
              <span aria-hidden="true">01</span>
              <div>
                <strong>{es ? "Inicia sesión" : "Sign in"}</strong>
                <p>
                  {es
                    ? "Continúa en la página oficial de AkiHQ."
                    : "Continue through the official AkiHQ sign-in page."}
                </p>
              </div>
            </li>
            <li>
              <span aria-hidden="true">02</span>
              <div>
                <strong>
                  {es ? "Comprueba tus accesos" : "Check your access"}
                </strong>
                <p>
                  {es
                    ? "Solo verás los espacios que tu cuenta pueda gestionar."
                    : "Only workspaces available to your account are shown."}
                </p>
              </div>
            </li>
            <li>
              <span aria-hidden="true">03</span>
              <div>
                <strong>
                  {es ? "Gestiona tu presencia" : "Manage your presence"}
                </strong>
                <p>
                  {es
                    ? "Actualiza fichas y eventos cuando tengas los permisos necesarios."
                    : "Update listings and events when you have the required permissions."}
                </p>
              </div>
            </li>
          </ol>
          <p className={styles.guideFootnote}>
            {es
              ? "¿Buscas TPV y operaciones? Eso pertenece a AkiBusiness."
              : "Looking for POS and operations? That's AkiBusiness, a separate product."}
          </p>
        </aside>
      </section>
    </main>
  );
}
