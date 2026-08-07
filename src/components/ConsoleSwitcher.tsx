import Link from "next/link";
import { Icon } from "@/components/Icons";
import type { Locale } from "@/lib/config";
import { roleCapabilities } from "@/lib/roles";

export type ConsoleKey = "account" | "business" | "staff" | "admin";

const consoleOrder: Array<{
  key: ConsoleKey;
  path: string;
  icon: "account" | "business" | "shield" | "settings";
  es: string;
  en: string;
  requires: keyof ReturnType<typeof roleCapabilities>;
}> = [
  {
    key: "account",
    path: "account",
    icon: "account",
    es: "Cuenta",
    en: "Account",
    requires: "useConsumerFeatures",
  },
  {
    key: "business",
    path: "business",
    icon: "business",
    es: "Negocio",
    en: "Business",
    requires: "manageOwnedVenues",
  },
  {
    key: "staff",
    path: "staff",
    icon: "shield",
    es: "Staff",
    en: "Staff",
    requires: "moderatePlatform",
  },
  {
    key: "admin",
    path: "admin",
    icon: "settings",
    es: "Admin",
    en: "Admin",
    requires: "administerPlatform",
  },
];

export function ConsoleSwitcher({
  locale,
  role,
  active,
}: {
  locale: Locale;
  role: string;
  active: ConsoleKey;
}) {
  const es = locale === "es";
  const capabilities = roleCapabilities(role);
  const available = consoleOrder.filter((entry) => capabilities[entry.requires]);

  if (available.length < 2) return null;

  return (
    <nav
      className="console-switcher"
      aria-label={es ? "Cambiar de espacio" : "Switch workspace"}
    >
      {available.map((entry) => (
        <Link
          key={entry.key}
          href={`/${locale}/${entry.path}`}
          className={entry.key === active ? "active" : undefined}
          aria-current={entry.key === active ? "page" : undefined}
        >
          <Icon name={entry.icon} />
          <span>{es ? entry.es : entry.en}</span>
        </Link>
      ))}
    </nav>
  );
}
