import { BrandMark } from "./BrandLogo";
import styles from "../app/[locale]/auth/auth-surfaces.module.css";

export function AuthBrand({ locale }: { locale: "en" | "es" }) {
  return (
    <div className={styles.brand}>
      <span className={styles.brandMark}>
        <BrandMark />
      </span>
      <span className={styles.brandName}>
        AkiPasa<span>.</span>
      </span>
      <p>
        {locale === "es"
          ? "Tu próximo plan empieza aquí."
          : "Your next plan starts here."}
      </p>
    </div>
  );
}
