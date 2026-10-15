import Link from "next/link";
import { config } from "../lib/config";
import { PortalLogo } from "./PortalLogo";
import { PortalHeaderTools } from "./PortalHeaderTools";

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
        aria-label={config.managementName}
        href={`/${locale}/business`}
      >
        <PortalLogo product={config.managementLogo} />
      </Link>
      <PortalHeaderTools locale={locale} product="business">
        {signedIn && (
          <form action={signOut} className="akibusiness-logout-form">
            <input type="hidden" name="locale" value={locale} />
            <button type="submit">
              {locale === "es" ? "Cerrar sesión" : "Log out"}
            </button>
          </form>
        )}
      </PortalHeaderTools>
    </header>
  );
}
