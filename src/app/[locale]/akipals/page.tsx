import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icons";
import { isLocale } from "@/lib/config";
import { previewAccess } from "@/lib/pals/server";
import styles from "./akipals.module.css";

export const dynamic = "force-dynamic";

export default async function AkiPalsEntrance({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  let access: Awaited<ReturnType<typeof previewAccess>> | null = null;
  try {
    access = await previewAccess();
  } catch {
    access = null;
  }
  const active = Boolean(access?.allowed && access.user);
  return (
    <main className={styles.page}>
      <section className={styles.stage}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>
            {es ? "AkiPasa presenta" : "AkiPasa presents"}
          </span>
          <h1>
            AkiPals<span>.</span>
          </h1>
          <p className={styles.lede}>
            {es
              ? "Tu identidad, tu estilo. Crea tu avatar 3D y dale tu toque con tu propio armario."
              : "Your identity, your style. Create your 3D avatar and make it yours with a personal wardrobe."}
          </p>
          {active ? (
            <Link className={styles.primary} href={`/pals?lang=${locale}`}>
              <Icon name="account" size={21} />{" "}
              {es ? "Abrir mi estudio 3D" : "Open my 3D studio"}
            </Link>
          ) : access?.user ? (
            <p className={styles.notice} role="status">
              {es
                ? "AkiPals sigue siendo una prueba privada. No se han abierto todavía las inscripciones generales."
                : "AkiPals remains a private playtest. General access is not open yet."}
            </p>
          ) : (
            <Link
              className={styles.primary}
              href={`/${locale}/auth?next=${encodeURIComponent(`/${locale}/akipals`)}`}
            >
              {es ? "Iniciar sesión" : "Sign in"}
            </Link>
          )}
          <div className={styles.links}>
            <Link href={`/${locale}/passports`}>
              <Icon name="passport" size={18} /> Passport
            </Link>
            <Link href={`/${locale}/account`}>
              <Icon name="account" size={18} />{" "}
              {es ? "Mi perfil" : "My profile"}
            </Link>
          </div>
        </div>
        <div
          className={styles.portrait}
          aria-label={es ? "Tu personaje" : "Your character"}
        >
          <div aria-hidden="true" className={styles.character}>
            <Icon name="account" size={96} />
          </div>
          <span className={styles.caption}>
            {active
              ? es
                ? "Tu estilo, en 3D"
                : "Your style, in 3D"
              : es
                ? "Un estudio 3D en desarrollo"
                : "A 3D studio in development"}
          </span>
        </div>
      </section>
    </main>
  );
}
