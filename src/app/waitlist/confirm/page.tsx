import type { Metadata } from "next";
import styles from "./confirm.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirma tu email | AkiPasa",
  description: "Confirma tu suscripción a las noticias de lanzamiento.",
  robots: { index: false, follow: false },
};

export default async function LaunchWaitlistConfirmation({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const stringValue = (key: string) =>
    typeof query[key] === "string" ? query[key] : "";
  const en = stringValue("lang") === "en";
  const status = stringValue("status");
  const entry = stringValue("entry");
  const token = stringValue("token");
  const product = stringValue("product");
  const destination =
    product === "duermo"
      ? "https://akiduermo.com"
      : product === "coches"
        ? "https://akicoches.com"
        : "https://akipasa.com";
  const valid =
    /^[a-f0-9-]{36}$/i.test(entry) && /^[a-f0-9]{64}$/i.test(token);
  const confirmed = status === "confirmed";
  const unavailable = status === "unavailable";
  const invalid = status === "invalid" || (!status && !valid);

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>AKIPASA · LAUNCH UPDATES</p>
        <h1>
          {confirmed
            ? en
              ? "Email confirmed"
              : "Correo confirmado"
            : invalid
              ? en
                ? "Link invalid or expired"
                : "Enlace no válido o caducado"
              : unavailable
                ? en
                  ? "Verification unavailable"
                  : "Verificación no disponible"
                : en
                  ? "One last step"
                  : "Solo falta un paso"}
        </h1>
        <p>
          {confirmed
            ? en
              ? "You're on the verified launch list. We'll email you about the product you chose."
              : "Ya estás en la lista de lanzamiento verificada. Te avisaremos sobre el producto que elegiste."
            : invalid
              ? en
                ? "Request a fresh verification email using the form on the original website."
                : "Solicita otro correo desde el formulario de la web original."
              : unavailable
                ? en
                  ? "We couldn't verify your request right now. Please try the link again later."
                  : "No hemos podido comprobar tu solicitud. Intenta abrir el enlace más tarde."
                : en
                  ? "Confirm your email to receive news about the product's launch."
                  : "Confirma tu correo para recibir noticias sobre el lanzamiento."}
        </p>
        {!status && valid ? (
          <form action="/api/launch-waitlist/confirm" method="post">
            <input type="hidden" name="entry" value={entry} />
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="lang" value={en ? "en" : "es"} />
            <button type="submit">
              {en ? "Confirm my email" : "Confirmar mi correo"}
            </button>
          </form>
        ) : null}
        <a href={destination}>
          {en ? "Back to the website" : "Volver a la web"}
        </a>
        <small>
          {en ? "Privacy or deletion requests: " : "Privacidad y bajas: "}
          <a href="mailto:support@akipasa.com">support@akipasa.com</a>
        </small>
      </section>
    </main>
  );
}
