import React, { type ReactNode } from "react";
import Link from "next/link";

export type ConsoleNavItem = {
  value: string;
  label: string;
  icon: string;
  count?: number;
};

export function ConsoleNav({
  basePath,
  active,
  label,
  items,
}: {
  basePath: string;
  active: string;
  label: string;
  items: ConsoleNavItem[];
}) {
  return (
    <nav className="console-nav" aria-label={label}>
      {items.map((item) => (
        <Link
          href={`${basePath}?view=${item.value}`}
          className={active === item.value ? "active" : undefined}
          aria-current={active === item.value ? "page" : undefined}
          key={item.value}
        >
          <ConsoleIcon label={item.icon} />
          <span>{item.label}</span>
          {item.count !== undefined && <strong>{item.count}</strong>}
        </Link>
      ))}
    </nav>
  );
}

export function ConsoleIcon({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  return (
    <span className="console-icon" aria-hidden="true">
      {children}
      <span>{label.slice(0, 2).toUpperCase()}</span>
    </span>
  );
}

export function ConsoleSectionHeader({
  label,
  title,
  description,
  icon,
}: {
  label: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="console-section-header">
      <ConsoleIcon label={icon}>
        <svg viewBox="0 0 24 24">
          <path d="M5 5h14v14H5z" />
          <path d="M8 9h8M8 12h8M8 15h5" />
        </svg>
      </ConsoleIcon>
      <div>
        <p>{label}</p>
        <h2>{title}</h2>
        <span>{description}</span>
      </div>
    </div>
  );
}

export function ConsoleMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail: string;
}) {
  return (
    <article className="panel metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
