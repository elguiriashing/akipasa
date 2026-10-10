import Link from "next/link";
import { PortalLogo } from "./PortalLogo";
import { Icon } from "./Icons";
import { LanguageLink } from "./LanguageLink";
import { ThemeToggle } from "./ThemeModeControls";
import { config } from "@/lib/config";

export function BusinessHeader({
  locale,
  signedIn,
  signOut,
}: {
  locale: "en" | "es";
  signedIn: boolean;
  signOut: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <header className="akibusiness-topbar">
      <Link
        className="akibusiness-brand"
        aria-label="AkiBusiness"
        href={`/${locale}/business`}
      >
        <PortalLogo product="business" />
      </Link>
      <nav
        aria-label={locale === "es" ? "Productos AkiPasa" : "AkiPasa products"}
      >
        <LanguageLink locale={locale === "es" ? "en" : "es"} compact />
        <ThemeToggle locale={locale} />
        <details className="portal-product-menu">
          <summary
            aria-label={locale === "es" ? "Más opciones" : "More options"}
          >
            <Icon name="more" />
          </summary>
          <div className="portal-product-popover">
            <a href={`${config.siteUrl.replace(/\/$/, "")}/${locale}`}>
              {locale === "es" ? "Abrir AkiPasa" : "Open AkiPasa"}
            </a>
            <a
              aria-label="AkiDuermo"
              href={`https://akiduermo.akipasa.com/?lang=${locale}`}
            >
              <PortalLogo product="duermo" />
            </a>
            <a aria-label="AkiHQ" href={config.crmUrl}>
              <PortalLogo product="hq" />
            </a>
            {signedIn && (
              <form action={signOut} className="akibusiness-logout-form">
                <input type="hidden" name="locale" value={locale} />
                <button type="submit">
                  {locale === "es" ? "Cerrar sesión" : "Log out"}
                </button>
              </form>
            )}
          </div>
        </details>
      </nav>
    </header>
  );
}
