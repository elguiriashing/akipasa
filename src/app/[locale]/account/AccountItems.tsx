import Link from "next/link";
import { WorkspaceEmpty } from "@/components/WorkspaceShell";

export function AccountItems({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: { id: string; label: string; href: string; date?: string }[];
  emptyTitle: string;
  emptyDescription: string;
}) {
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
                {new Date(item.date).toLocaleDateString()}
              </time>
            )}
          </div>
          <Link className="button secondary" href={item.href}>
            Open
          </Link>
        </div>
      ))}
    </div>
  );
}
