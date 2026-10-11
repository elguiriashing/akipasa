"use client";

import React from "react";
import { usePathname } from "next/navigation";

export function RouteLoading() {
  const spanish = usePathname().split("/")[1] === "es";
  return (
    <div
      className="route-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="route-loading-heading">
        <span className="route-loading-mark" aria-hidden="true" />
        <span>{spanish ? "Cargando…" : "Loading…"}</span>
      </div>
      <div className="route-loading-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
