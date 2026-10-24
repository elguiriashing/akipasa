import Image from "next/image";
import styles from "./PortalLogo.module.css";

export function PortalLogo({
  product,
}: {
  product: "pasa" | "business" | "duermo" | "hq" | "coches";
}) {
  const suffix =
    product === "business"
      ? "Business"
      : product === "pasa"
        ? "Pasa"
        : product === "duermo"
          ? "Duermo"
          : product === "coches"
            ? "Coches"
            : "HQ";
  return (
    <span className={`${styles.logo} ${styles[product]}`} aria-hidden="true">
      <Image
        src={
          product === "pasa"
            ? "/brand/v3/pasa.svg"
            : product === "hq"
              ? "/brand/v3/hq.svg"
              : product === "coches"
                ? "/brand/v3/coches.svg"
                : product === "business"
                  ? "/brand/v3/business.svg"
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
