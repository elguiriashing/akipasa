import Link from "next/link";
import { WorkspaceEmpty } from "@/components/WorkspaceShell";

export function AccountItems({
  items,
  locale,
  emptyTitle,
  emptyDescription,
}: {
  items: { id: string; label: string; href: string; date?: string }[];
  locale: "es" | "en";
  emptyTitle: string;
  emptyDescription: string;
}) {
  const openLabel = locale === "es" ? "Abrir" : "Open";
  if (!items.length) {
    return <WorkspaceEmpty title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <div className="panel managed-list">
      {items.map((item) => (
        <div className="managed-row" key={item.id}>
          <div>
            <strong>{item.label}</strong>
            {item.date && (
              <time dateTime={item.date}>
                {new Date(item.date).toLocaleDateString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            )}
          </div>
          <Link
            className="button secondary"
            href={item.href}
            aria-label={`${openLabel}: ${item.label}`}
          >
            {openLabel}
          </Link>
        </div>
      ))}
    </div>
  );
}
