import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icons";
import { isLocale } from "@/lib/config";
import { previewAccess, readState } from "@/lib/pals/server";
import { statePortrait } from "@/lib/pals/art";
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
  let portrait: string | null = null;
  try {
    access = await previewAccess();
    if (access.allowed && access.user) {
      const saved = await readState(access.user.id);
      if (saved?.state.family) {
        portrait = `data:image/svg+xml;base64,${Buffer.from(statePortrait(saved.state, "pals-landing")).toString("base64")}`;
      }
    }
  } catch {
    access = null;
  }
  const active = Boolean(access?.allowed && access.user);
  return (
    <main className={styles.page}>
      <section className={styles.stage}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>AkiPasa presents</span>
          <h1>AkiPals<span>.</span></h1>
          <p className={styles.lede}>
            {es
              ? "Tus compañeros virtuales, tu estilo. Viste, juega y conserva tus aventuras."
              : "Your virtual crew, your style. Dress up, play, and keep your adventures."}
          </p>
          {active ? (
            <Link className={styles.primary} href="/pals">
              <Icon name="gift" size={21} /> {es ? "Entrar en mi mundo" : "Enter my world"}
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
              <Icon name="account" size={18} /> {es ? "Mi perfil" : "My profile"}
            </Link>
          </div>
        </div>
        <div className={styles.portrait} aria-label={es ? "Tu personaje" : "Your character"}>
          {portrait ? (
            <Image unoptimized src={portrait} alt={es ? "Tu AkiPal" : "Your AkiPal"} width={300} height={350} />
          ) : (
            <div aria-hidden="true" className={styles.character}>
              <Icon name="star" size={96} />
            </div>
          )}
          <span className={styles.caption}>
            {active ? (es ? "Tu AkiPal guardado" : "Your saved AkiPal") : (es ? "Un universo para explorar" : "A little world to explore")}
          </span>
        </div>
      </section>
    </main>
  );
}
