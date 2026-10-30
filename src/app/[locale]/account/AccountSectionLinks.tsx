"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/config";

/** Consumer sections; the existing Account menu retains every authorised destination. */
export function AccountSectionLinks({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const base = `/${locale}/account`;
  const links = [
    { href: base, label: locale === "es" ? "Perfil" : "Profile" },
    { href: `${base}/profile`, label: locale === "es" ? "Editar" : "Edit" },
    {
      href: `${base}/settings`,
      label: locale === "es" ? "Ajustes" : "Settings",
    },
  ];
  return (
    <nav
      className="account-section-links"
      aria-label={
        locale === "es" ? "Secciones de tu cuenta" : "Your account sections"
      }
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
