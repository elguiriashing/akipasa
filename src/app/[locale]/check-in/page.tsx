import Link from "next/link";
import { CheckInScanner } from "@/components/CheckInScanner";
import { isLocale } from "@/lib/config";
import { notFound } from "next/navigation";
import styles from "./check-in.module.css";

export default async function CheckInEntry({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const steps = es
    ? [
        ["Ve al local", "Busca su QR oficial de AkiPasa."],
        ["Escanea el código", "Activa la cámara cuando estés listo."],
        ["Confirma tu visita", "Verifica tu ubicación antes de continuar."],
      ]
    : [
        ["Be there", "Find the venue’s official AkiPasa QR."],
        ["Scan the code", "Open the camera when you’re ready."],
        ["Confirm your visit", "Verify your location before continuing."],
      ];
  return (
    <main className={`shell ${styles.page}`}>
      <header className={styles.intro}>
        <p className={styles.kicker}>AKIPASA / CHECK-IN</p>
        <h1>
          {es ? "Ya estás aquí." : "You’re here."}
          <span>{es ? "Haz check-in." : "Check in."}</span>
        </h1>
        <p className={styles.description}>
          {es
            ? "Escanea el QR oficial del local, verifica tu ubicación y confirma tu visita."
            : "Scan the venue’s official QR, verify your location and confirm your visit."}
        </p>
        <div className={styles.introActions}>
          <Link href={`/${locale}/map`}>
            {es ? "Explorar locales" : "Explore venues"}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 17 17 7M7 7h10v10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </header>

      <section className={styles.camera} aria-labelledby="checkin-camera-title">
        <div className={styles.cameraHeading}>
          <h2 id="checkin-camera-title">
            {es ? "QR oficial del local" : "Official venue QR"}
          </h2>
          <span aria-hidden="true">{es ? "CÁMARA" : "CAMERA"}</span>
        </div>
        <CheckInScanner locale={locale} />
        <p className={styles.privacy}>
          {es
            ? "La cámara solo se activa cuando tú lo eliges."
            : "The camera only starts when you choose."}
        </p>
      </section>

      <section className={styles.guide} aria-labelledby="checkin-guide-title">
        <div className={styles.guideHeading}>
          <h2 id="checkin-guide-title">
            {es
              ? "Estar aquí es el primer paso."
              : "Being here is the first step."}
          </h2>
        </div>
        <ol className={styles.steps}>
          {steps.map(([title, description], index) => (
            <li key={title}>
              <span className={styles.stepNumber} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className={styles.notice}>
          {es
            ? "Abrir esta pantalla o escanear un código no registra una visita ni otorga puntos. Debes verificar y confirmar el check-in."
            : "Opening this screen or scanning a code does not record a visit or grant points. You must verify and confirm the check-in."}
        </p>
      </section>
    </main>
  );
}
