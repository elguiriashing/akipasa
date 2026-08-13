"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icons";

export type WorkspaceIcon = Extract<
  IconName,
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
  | "venue"
>;

export type WorkspaceItem = {
  href: string;
  label: string;
  icon: WorkspaceIcon;
  count?: number;
};

function matchesPath(
  pathname: string,
  searchParams: URLSearchParams,
  href: string,
) {
  const [hrefPath, query = ""] = href.split("?");
  if (query) {
    const expected = new URLSearchParams(query);
    return (
      pathname === hrefPath &&
      [...expected].every(([key, value]) => searchParams.get(key) === value)
    );
  }
  if (searchParams.has("view")) return false;
  return (
    pathname === hrefPath ||
    (hrefPath.split("/").length > 3 && pathname.startsWith(`${hrefPath}/`))
  );
}

export function WorkspaceShell({
  title,
  eyebrow,
  description,
  homeHref,
  items,
  navigationTitle = title,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  homeHref: string;
  items: WorkspaceItem[];
  navigationTitle?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const desktopNavigationRef = useRef<HTMLElement>(null);
  const dragState = useRef({
    active: false,
    moved: false,
    startX: 0,
    scrollLeft: 0,
  });
  const spanish = homeHref.startsWith("/es/");
  const menuLabel = spanish ? "MenÃº" : "Menu";
  const closeLabel = spanish ? "Cerrar" : "Close";
  const consumerWorkspace = [
    "/account",
    "/business",
    "/admin",
    "/community",
    "/passports",
    "/staff",
  ].some((segment) => homeHref.includes(segment));
  const activeItem = items.find((item) =>
    matchesPath(pathname, searchParams, item.href),
  );

  function startNavigationDrag(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch" || event.button !== 0) return;
    const navigation = desktopNavigationRef.current;
    if (!navigation || navigation.scrollWidth <= navigation.clientWidth) return;
    dragState.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: navigation.scrollLeft,
    };
    navigation.setPointerCapture(event.pointerId);
    navigation.classList.add("is-dragging");
  }

  function moveNavigationDrag(event: React.PointerEvent<HTMLElement>) {
    const navigation = desktopNavigationRef.current;
    if (!navigation || !dragState.current.active) return;
    const distance = event.clientX - dragState.current.startX;
    if (Math.abs(distance) > 5) dragState.current.moved = true;
    navigation.scrollLeft = dragState.current.scrollLeft - distance;
  }

  function endNavigationDrag(event: React.PointerEvent<HTMLElement>) {
    const navigation = desktopNavigationRef.current;
    if (!navigation) return;
    dragState.current.active = false;
    navigation.classList.remove("is-dragging");
    if (navigation.hasPointerCapture(event.pointerId))
      navigation.releasePointerCapture(event.pointerId);
  }

  function scrollNavigation(event: React.WheelEvent<HTMLElement>) {
    const navigation = desktopNavigationRef.current;
    if (!navigation || navigation.scrollWidth <= navigation.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    navigation.scrollLeft += event.deltaY;
    event.preventDefault();
  }

  useEffect(() => {
    if (!drawerOpen) return;

    drawerCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [drawerOpen]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const desktop = window.matchMedia("(min-width: 851px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setDrawerOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    const navigation = desktopNavigationRef.current;
    const active = navigation?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (typeof active?.scrollIntoView === "function") {
      active.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [pathname, searchParams]);

  const navigation = (
    <>
      <div className="workspace-brand">
        <Link href={homeHref} onClick={() => setDrawerOpen(false)}>
          <span className="workspace-mark">A</span>
          <span className="workspace-brand-copy">
            <strong>{navigationTitle}</strong>
            <small>{eyebrow}</small>
          </span>
        </Link>
        <button
          className="workspace-collapse"
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
        >
          <span aria-hidden="true">{collapsed ? "â€º" : "â€¹"}</span>
        </button>
      </div>
      <nav
        className="workspace-navigation"
        aria-label={`${navigationTitle} sections`}
        ref={desktopNavigationRef}
        onPointerDown={startNavigationDrag}
        onPointerMove={moveNavigationDrag}
        onPointerUp={endNavigationDrag}
        onPointerCancel={endNavigationDrag}
        onWheel={scrollNavigation}
      >
        {items.map((item) => {
          const active = matchesPath(pathname, searchParams, item.href);
          return (
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={active ? "active" : undefined}
              onClick={(event) => {
                if (dragState.current.moved) {
                  event.preventDefault();
                  dragState.current.moved = false;
                  return;
                }
                setDrawerOpen(false);
              }}
              key={item.href}
              title={collapsed ? item.label : undefined}
            >
              <span className="workspace-glyph">
                <Icon name={item.icon} />
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
    <main
      className={[
        "workspace-shell",
        "workspace-grid-system",
        consumerWorkspace ? "consumer-workspace" : "",
        collapsed ? "is-collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={title}
    >
      <button
        className="workspace-mobile-trigger"
        type="button"
        aria-label={`${eyebrow} ${navigationTitle} menu`}
        aria-expanded={drawerOpen}
        aria-controls="workspace-mobile-drawer"
        onClick={() => setDrawerOpen((value) => !value)}
      >
        <span className="workspace-menu-glyph" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          <small>{eyebrow}</small>
          <strong>{activeItem?.label ?? navigationTitle}</strong>
        </span>
        <span aria-hidden="true">{menuLabel}</span>
      </button>

      <aside className="workspace-sidebar">{navigation}</aside>

      {drawerOpen && (
        <div className="workspace-drawer-layer" id="workspace-mobile-drawer">
          <aside
            className="workspace-drawer"
            aria-label={`${navigationTitle} navigation`}
          >
            <button
              ref={drawerCloseRef}
              className="workspace-drawer-close"
              type="button"
              onClick={() => setDrawerOpen(false)}
            >
              {closeLabel}
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
        <div className="workspace-grid-body">{children}</div>
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
        <Icon name="inbox" />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </section>
  );
}
