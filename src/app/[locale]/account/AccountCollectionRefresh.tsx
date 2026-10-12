"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";

export function AccountCollectionRefresh({ locale }: { locale: "es" | "en" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const es = locale === "es";
  return (
    <button
      type="button"
      className="button secondary"
      disabled={pending}
      aria-busy={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending
        ? es
          ? "Cargando…"
          : "Loading…"
        : es
          ? "Reintentar"
          : "Try again"}
    </button>
  );
}
