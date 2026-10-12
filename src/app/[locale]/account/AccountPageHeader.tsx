import type { ReactNode } from "react";

/** One readable page title inside the compact Account workspace. */
export function AccountPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="workspace-section-heading account-page-heading">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="workspace-heading-actions">{actions}</div>}
    </header>
  );
}
