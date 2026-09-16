"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { OwnerPreferences } from "@/lib/owner-console";

const particles = ["*", "+", ".", "*", "+", ".", "*", "+", ".", "*", "+", "."];

export function OwnerToolboxLauncher({
  locale,
  preferences,
}: {
  locale: "en" | "es";
  preferences: OwnerPreferences;
}) {
  const pathname = usePathname();
  const es = locale === "es";
  const [open, setOpen] = useState(false);
  const [grid, setGrid] = useState(false);
  const [focus, setFocus] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.ownerBackground = preferences.background;
    root.dataset.ownerAccent = preferences.accent;
    root.dataset.ownerMotion = String(preferences.motion);
    root.dataset.ownerGlass = String(preferences.glass);
    if (preferences.backgroundImageUrl) {
      root.dataset.ownerCustomBackground = "true";
      root.style.setProperty(
        "--owner-background-image",
        `url("${preferences.backgroundImageUrl}")`,
      );
    } else {
      delete root.dataset.ownerCustomBackground;
      root.style.removeProperty("--owner-background-image");
    }
    return () => {
      delete root.dataset.ownerBackground;
      delete root.dataset.ownerAccent;
      delete root.dataset.ownerMotion;
      delete root.dataset.ownerGlass;
      delete root.dataset.ownerCustomBackground;
      delete root.dataset.ownerGrid;
      delete root.dataset.ownerFocus;
      root.style.removeProperty("--owner-background-image");
    };
  }, [preferences]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "o"
      ) {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  function toggleGrid() {
    setGrid((value) => {
      const next = !value;
      document.documentElement.dataset.ownerGrid = String(next);
      return next;
    });
  }

  function toggleFocus() {
    setFocus((value) => {
      const next = !value;
      document.documentElement.dataset.ownerFocus = String(next);
      return next;
    });
  }

  async function copyRoute() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function celebrate() {
    setCelebrating(false);
    window.requestAnimationFrame(() => setCelebrating(true));
    window.setTimeout(() => setCelebrating(false), 1800);
  }

  return (
    <>
      <button
        type="button"
        className="owner-toolbox-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Ctrl/Cmd + Shift + O"
      >
        <span aria-hidden="true">DEV</span>
        Toolbox
      </button>
      {open && (
        <div className="owner-toolbox-layer" onMouseDown={() => setOpen(false)}>
          <aside
            className="owner-toolbox-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="owner-toolbox-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>OWNER CONSOLE</span>
                <h2 id="owner-toolbox-title">
                  {es ? "Mesa de Alex" : "Alex deck"}
                </h2>
                <p>{pathname}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={es ? "Cerrar" : "Close"}
              >
                X
              </button>
            </header>

            <div className="owner-toolbox-status">
              <span>
                <i /> {es ? "Propietario verificado" : "Verified owner"}
              </span>
              <kbd>Ctrl/Cmd + Shift + O</kbd>
            </div>

            <nav className="owner-toolbox-links">
              <Link href={`/${locale}/owner`} onClick={() => setOpen(false)}>
                <strong>OC</strong>
                <span>
                  {es ? "Consola completa" : "Full owner console"}
                  <small>
                    {es
                      ? "Estado, temas y herramientas"
                      : "Status, themes and tools"}
                  </small>
                </span>
              </Link>
              <Link
                href={`/${locale}/admin/ai-team`}
                onClick={() => setOpen(false)}
              >
                <strong>AI</strong>
                <span>
                  {es ? "Equipo de IA" : "AI Team"}
                  <small>
                    {es
                      ? "Agentes, tareas y aprobaciones"
                      : "Agents, tasks and approvals"}
                  </small>
                </span>
              </Link>
              <Link
                href={`/${locale}/staff/moderation`}
                onClick={() => setOpen(false)}
              >
                <strong>MD</strong>
                <span>
                  {es ? "Moderaci\u00f3n" : "Moderation"}
                  <small>
                    {es
                      ? "Colas y modo autom\u00e1tico"
                      : "Queues and automatic mode"}
                  </small>
                </span>
              </Link>
              <Link
                href={`/${locale}/admin/audit`}
                onClick={() => setOpen(false)}
              >
                <strong>AU</strong>
                <span>
                  {es ? "Auditor\u00eda" : "Audit trail"}
                  <small>
                    {es ? "Actividad sensible" : "Sensitive activity"}
                  </small>
                </span>
              </Link>
            </nav>

            <section className="owner-toolbox-dev">
              <span>{es ? "Controles de p\u00e1gina" : "Page controls"}</span>
              <div>
                <button
                  type="button"
                  className={grid ? "active" : ""}
                  onClick={toggleGrid}
                >
                  # {es ? "Cuadr\u00edcula" : "Grid"}
                </button>
                <button
                  type="button"
                  className={focus ? "active" : ""}
                  onClick={toggleFocus}
                >
                  [] {es ? "Enfoque" : "Focus"}
                </button>
                <button type="button" onClick={copyRoute}>
                  {copied
                    ? es
                      ? "Copiado"
                      : "Copied"
                    : es
                      ? "Copiar URL"
                      : "Copy URL"}
                </button>
                <button type="button" onClick={() => window.location.reload()}>
                  {es ? "Recargar" : "Reload"}
                </button>
              </div>
            </section>

            <div className="owner-toolbox-external">
              <a
                href="https://crm.akipasa.com"
                target="_blank"
                rel="noreferrer"
              >
                AkiHQ -&gt;
              </a>
              <a
                href="https://supabase.com/dashboard/project/vhpbvcfkcteswlsdjrfl"
                target="_blank"
                rel="noreferrer"
              >
                Supabase -&gt;
              </a>
              <a
                href="https://dash.cloudflare.com"
                target="_blank"
                rel="noreferrer"
              >
                Cloudflare -&gt;
              </a>
            </div>

            <button
              type="button"
              className="owner-celebrate"
              onClick={celebrate}
            >
              * {es ? "Celebrar" : "Ship it sparkle"}
            </button>
          </aside>
        </div>
      )}
      {celebrating && (
        <div className="owner-confetti" aria-hidden="true">
          {particles.map((particle, index) => (
            <i
              key={index}
              style={{ "--owner-particle": index } as React.CSSProperties}
            >
              {particle}
            </i>
          ))}
        </div>
      )}
    </>
  );
}
