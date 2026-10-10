import Image from "next/image";
import styles from "./PortalLogo.module.css";

export function PortalLogo({
  product,
}: {
  product: "pasa" | "business" | "duermo" | "hq";
}) {
  const suffix =
    product === "business"
      ? "Business"
      : product === "pasa"
        ? "Pasa"
        : product === "duermo"
          ? "Duermo"
          : "HQ";
  return (
    <span className={`${styles.logo} ${styles[product]}`} aria-hidden="true">
      <Image
        src={
          product === "pasa"
            ? "/pwa/akipasa-512.png"
            : `/brand/${product}-icon.png`
        }
        alt=""
        width={40}
        height={40}
        priority
      />
      <span className={styles.wordmark}>
        Aki<span>{suffix}</span>
        <i>.</i>
      </span>
    </span>
  );
}
