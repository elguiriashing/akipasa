import Link from "next/link";
import { Icon } from "../../../components/Icons";

export function RewardsTabs({
  locale,
  active,
}: {
  locale: "en" | "es";
  active: "passports" | "awards" | "achievements";
}) {
  const es = locale === "es";
  const tabs = [
    {
      id: "passports",
      href: `/${locale}/admin/passports`,
      icon: "passport" as const,
      title: es ? "Pasaportes" : "Passports",
      detail: es ? "Campañas y rutas" : "Campaigns & routes",
    },
    {
      id: "awards",
      href: `/${locale}/admin/passports/awards`,
      icon: "gift" as const,
      title: es ? "Otorgar sellos" : "Grant stamps",
      detail: es ? "Reconocer miembros" : "Reward members",
    },
    {
      id: "achievements",
      href: `/${locale}/admin/achievements`,
      icon: "star" as const,
      title: es ? "Logros" : "Achievements",
      detail: es ? "Reglas y categorías" : "Rules & categories",
    },
  ];
  return (
    <section className="admin-rewards-hub" aria-label={es ? "Centro de recompensas" : "Rewards centre"}>
      <div className="admin-rewards-intro">
        <div>
          <span>{es ? "Centro de recompensas" : "Rewards centre"}</span>
          <h2>{es ? "Recompensas y pasaportes" : "Rewards & passports"}</h2>
          <p>{es
            ? "Campañas, sellos y logros en un solo espacio. Elige la herramienta."
            : "Campaigns, stamps and achievements in one workspace. Choose your tool."}</p>
        </div>
      </div>
      <nav className="admin-rewards-tabs" aria-label={es ? "Herramientas de recompensas" : "Rewards tools"}>
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={tab.id === active ? "page" : undefined}
            className={tab.id === active ? "active" : ""}
          >
            <Icon name={tab.icon} />
            <span><strong>{tab.title}</strong><small>{tab.detail}</small></span>
            <Icon name="chevron" />
          </Link>
        ))}
      </nav>
    </section>
  );
}
