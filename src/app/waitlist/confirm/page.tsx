import type { Metadata } from "next";
import { Icon } from "@/components/Icons";
import styles from "./confirm.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirma tu email | AkiPasa",
  description: "Confirma tu suscripción a las noticias de lanzamiento.",
  robots: { index: false, follow: false },
};

const products = {
  pasa: { name: "AkiPasa", destination: "https://akipasa.com", icon: "map" },
  duermo: { name: "AkiDuermo", destination: "https://akiduermo.com", icon: "bed" },
  coches: { name: "AkiCoches", destination: "https://akicoches.com", icon: "car" },
} as const;

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
  const requestedProduct = stringValue("product");
  const product =
    requestedProduct === "duermo"
      ? "duermo"
      : requestedProduct === "coches"
        ? "coches"
        : "pasa";
  const { name: productName, destination, icon } = products[product];
  const valid = /^[a-f0-9-]{36}$/i.test(entry) && /^[a-f0-9]{64}$/i.test(token);
  const confirmed = status === "confirmed";
  const unavailable = status === "unavailable";
  const invalid = status === "invalid" || (!status && !valid);
  const canConfirm = !status && valid;

  return (
    <main className={styles.page} data-product={product}>
      <div className={styles.layout}>
        <aside
          className={styles.story}
          aria-label={en ? "How launch updates work" : "Cómo funcionan los avisos"}
        >
          <a className={styles.brand} href={destination}>
            <span className={styles.brandIcon}>
              <Icon name={icon} size={24} />
            </span>
            <strong>{productName}</strong>
          </a>
          <p className={styles.kicker}>
            {en ? "COSTA DEL SOL · LAUNCH UPDATES" : "COSTA DEL SOL · NOVEDADES"}
          </p>
          <h2>
            {en
              ? "Be there when the next chapter opens."
              : "Entérate cuando empiece la próxima etapa."}
          </h2>
          <p className={styles.storyCopy}>
            {en
              ? "We're building with real local demand. Confirming your email means you can receive launch news for the product you chose. It doesn't create a booking or a paid subscription."
              : "Crecemos según el interés local. Al confirmar tu correo, podrás recibir novedades del producto elegido. No se crea ninguna reserva ni suscripción de pago."}
          </p>
          <ol className={styles.steps}>
            <li>
              <span>01</span>
              <div>
                <strong>{en ? "Join the list" : "Apúntate"}</strong>
                <small>{en ? "Choose your product" : "Elige tu producto"}</small>
              </div>
            </li>
            <li className={styles.currentStep}>
              <span>02</span>
              <div>
                <strong>{en ? "Verify your email" : "Verifica tu correo"}</strong>
                <small>{en ? "Use the private link" : "Usa el enlace privado"}</small>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>{en ? "Get launch news" : "Recibe novedades"}</strong>
                <small>{en ? "When there is real news" : "Cuando haya noticias reales"}</small>
              </div>
            </li>
          </ol>
          <div className={styles.routeArt} aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </aside>

        <section className={styles.panel} aria-labelledby="waitlist-confirm-heading">
          <div className={styles.panelTop}>
            <p className={styles.eyebrow}>
              {productName} · {en ? "EMAIL VERIFICATION" : "VERIFICACIÓN DE EMAIL"}
            </p>
            <span className={styles.statusIcon} aria-hidden="true">
              <Icon
                name={confirmed ? "shield" : invalid ? "lock" : "bell"}
                size={26}
              />
            </span>
          </div>
          <h1 id="waitlist-confirm-heading">
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
          <p className={styles.explanation}>
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
          {canConfirm && (
            <form action="/api/launch-waitlist/confirm" method="post">
              <input type="hidden" name="entry" value={entry} />
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="lang" value={en ? "en" : "es"} />
              <button className={styles.confirmButton} type="submit">
                {en ? "Confirm my email" : "Confirmar mi correo"}
                <Icon name="arrow-right" size={19} />
              </button>
            </form>
          )}
          <a className={styles.returnLink} href={destination}>
            {en ? "Back to the website" : "Volver a la web"}
            <Icon name="arrow-right" size={18} />
          </a>
          <div className={styles.privacyLine}>
            <Icon name="lock" size={17} />
            <small>
              {en ? "Privacy or deletion requests: " : "Privacidad y bajas: "}
              <a href="mailto:support@akipasa.com">support@akipasa.com</a>
            </small>
          </div>
        </section>
      </div>
    </main>
  );
}
