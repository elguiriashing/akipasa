"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";
import type { AdminUserRecord } from "@/lib/admin-users";
import { roleLabel } from "../../../../lib/roles";

export function UserSearch({ locale }: { locale: "es" | "en" }) {
  const [query, setQuery] = useState("");
  const [retry, setRetry] = useState(0);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const es = locale === "es";

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setUsers([]);
      setState("idle");
      return;
    }
    let active = true;
    const controller = new AbortController();
    setUsers([]);
    setState("loading");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/users?q=${encodeURIComponent(value)}`,
          {
            signal: controller.signal,
            headers: { accept: "application/json" },
          },
        );
        if (!response.ok) throw new Error("search-failed");
        const body = (await response.json()) as { users?: AdminUserRecord[] };
        if (!active) return;
        setUsers(body.users || []);
        setState("ready");
      } catch (error) {
        if (active && (error as Error).name !== "AbortError") {
          setUsers([]);
          setState("error");
        }
      }
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, retry]);

  return (
    <section className="user-search-workspace">
      <div className="admin-search-field">
        <label htmlFor="admin-user-search">
          {es ? "Buscar cuentas" : "Search accounts"}
        </label>
        <input
          id="admin-user-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={es ? "Email o nombre visible" : "Email or display name"}
          autoComplete="off"
          minLength={2}
          aria-describedby="admin-user-search-hint"
        />
        <small id="admin-user-search-hint">
          {es
            ? "Escribe al menos 2 caracteres. Los resultados se consultan en el servidor."
            : "Enter at least 2 characters. Results are queried server-side."}
        </small>
      </div>
      <div className="search-status" role="status" aria-live="polite">
        {state === "loading" && (es ? "Buscando…" : "Searching…")}
        {state === "error" && (
          <>
            {es ? "No se pudo buscar." : "Search failed."}{" "}
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
            >
              {es ? "Reintentar" : "Retry"}
            </button>
          </>
        )}
        {state === "ready" &&
          !users.length &&
          (es ? "No hay coincidencias." : "No matching accounts.")}
      </div>
      {users.length > 0 && (
        <div className="user-search-results">
          {users.map((user) => (
            <Link
              href={`/${locale}/admin/users/${user.profile_id}`}
              className="panel user-search-result"
              key={user.profile_id}
            >
              <div>
                <strong>
                  {user.display_name ||
                    (es ? "Sin nombre visible" : "No display name")}
                </strong>
                <span>{user.primary_email}</span>
                {user.google_email &&
                  user.google_email !== user.primary_email && (
                    <small>Google: {user.google_email}</small>
                  )}
              </div>
              <div>
                <span className="status-pill">
                  {roleLabel(user.app_role, locale)}
                </span>
                <small>{user.account_status}</small>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
