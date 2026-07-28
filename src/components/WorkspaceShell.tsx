"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState, type ReactNode } from "react";

export type WorkspaceIcon =
  | "activity"
  | "audit"
  | "business"
  | "calendar"
  | "gift"
  | "home"
  | "inbox"
  | "lock"
  | "megaphone"
  | "person"
  | "saved"
  | "settings"
  | "shield"
  | "users"
  | "venue";

export type WorkspaceItem = {
  href: string;
  label: string;
  icon: WorkspaceIcon;
  count?: number;
};

function WorkspaceGlyph({ icon }: { icon: WorkspaceIcon }) {
  const paths: Record<WorkspaceIcon, ReactNode> = {
    activity: <path d="M4 13h3l2-6 4 10 2-5h5" />,
    audit: (
      <>
        <path d="M7 3h10v18H7z" />
        <path d="M10 8h4M10 12h4M10 16h3" />
      </>
    ),
    business: (
      <>
        <path d="M4 8h16v12H4zM8 8V4h8v4" />
        <path d="M4 13h16M10 12v3h4v-3" />
      </>
    ),
    calendar: (
      <>
        <path d="M4 6h16v14H4zM8 3v6M16 3v6M4 10h16" />
        <path d="M8 14h3M14 14h2M8 17h2" />
      </>
    ),
    gift: (
      <>
        <path d="M4 10h16v10H4zM3 7h18v4H3zM12 7v13" />
        <path d="M12 7c-4 0-5-1.5-5-3 0-1.2 1-2 2.2-2C11 2 12 4.5 12 7Zm0 0c4 0 5-1.5 5-3 0-1.2-1-2-2.2-2C13 2 12 4.5 12 7Z" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M10 20v-6h4v6" />
      </>
    ),
    inbox: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M4 13h4l2 3h4l2-3h4" />
      </>
    ),
    lock: (
      <>
        <path d="M6 10h12v10H6zM8 10V7a4 4 0 0 1 8 0v3" />
        <path d="M12 14v2" />
      </>
    ),
    megaphone: (
      <>
        <path d="m4 10 12-5v14L4 14zM16 9h3v6h-3" />
        <path d="m7 15 2 5h3l-2-6" />
      </>
    ),
    person: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21c.8-4.5 3.2-7 7-7s6.2 2.5 7 7" />
      </>
    ),
    saved: <path d="M6 3h12v18l-6-4-6 4z" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2" />
        <path d="M3 20c.6-4 2.6-6 6-6s5.4 2 6 6M15 15c3 0 5 1.5 6 4" />
      </>
    ),
    venue: (
      <>
        <path d="M5 9h14v12H5zM3 9l2-6h14l2 6" />
        <path d="M9 21v-6h6v6M3 9c0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0" />
      </>
    ),
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {paths[icon]}
    </svg>
  );
}

function matchesPath(pathname: string, href: string) {
  return (
    pathname === href ||
    (href.split("/").length > 3 && pathname.startsWith(`${href}/`))
  );
}

export function WorkspaceShell({
  title,
  eyebrow,
  description,
  homeHref,
  items,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  homeHref: string;
  items: WorkspaceItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;

    drawerCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [drawerOpen]);

  const navigation = (
    <>
      <div className="workspace-brand">
        <Link href={homeHref} onClick={() => setDrawerOpen(false)}>
          <span className="workspace-mark">A</span>
          <span className="workspace-brand-copy">
            <strong>{title}</strong>
            <small>{eyebrow}</small>
          </span>
        </Link>
        <button
          className="workspace-collapse"
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
        >
          <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
        </button>
      </div>
      <nav className="workspace-navigation" aria-label={`${title} sections`}>
        {items.map((item) => {
          const active = matchesPath(pathname, item.href);
          return (
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={active ? "active" : undefined}
              onClick={() => setDrawerOpen(false)}
              key={item.href}
            >
              <span className="workspace-glyph">
                <WorkspaceGlyph icon={item.icon} />
              </span>
              <span className="workspace-link-label">{item.label}</span>
              {item.count !== undefined && (
                <strong className="workspace-count">{item.count}</strong>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <main className={`workspace-shell${collapsed ? "is-collapsed" : ""}`}>
      <button
        className="workspace-mobile-trigger"
        type="button"
        aria-label={`${eyebrow} ${title} menu`}
        aria-expanded={drawerOpen}
        aria-controls="workspace-mobile-drawer"
        onClick={() => setDrawerOpen(true)}
      >
        <span className="workspace-glyph">
          <WorkspaceGlyph icon="settings" />
        </span>
        <span>
          <small>{eyebrow}</small>
          <strong>{title}</strong>
        </span>
        <span aria-hidden="true">Menu</span>
      </button>

      <aside className="workspace-sidebar">{navigation}</aside>

      {drawerOpen && (
        <div className="workspace-drawer-layer" id="workspace-mobile-drawer">
          <button
            className="workspace-drawer-backdrop"
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="workspace-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${title} navigation`}
          >
            <button
              ref={drawerCloseRef}
              className="workspace-drawer-close"
              type="button"
              onClick={() => setDrawerOpen(false)}
            >
              Close
            </button>
            {navigation}
          </aside>
        </div>
      )}

      <div className="workspace-content">
        <header className="workspace-page-heading">
          <div>
            <span>{eyebrow}</span>
            <h1>{title}</h1>
          </div>
          <p>{description}</p>
        </header>
        {children}
      </div>
    </main>
  );
}

export function WorkspacePageHeader({
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
    <header className="workspace-section-heading">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions && <div className="workspace-heading-actions">{actions}</div>}
    </header>
  );
}

export function WorkspaceEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="workspace-empty panel">
      <span className="workspace-glyph">
        <WorkspaceGlyph icon="inbox" />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </section>
  );
}
