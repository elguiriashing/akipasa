"use client";
import { useState, useTransition } from "react";
import type { Locale } from "@/lib/config";
import { prestigePrivacyAction } from "@/app/[locale]/passports/prestige/actions";
export function PassportPrestigePrivacy({
  locale,
  awardId,
  address = false,
  shared = false,
}: {
  locale: Locale;
  awardId: string;
  address?: boolean;
  shared?: boolean;
}) {
  const [pending, start] = useTransition(),
    [message, setMessage] = useState("");
  const es = locale === "es";
  function apply(action: "shipping_delete" | "withdraw") {
    start(async () => {
      setMessage("");
      try {
        const result = await prestigePrivacyAction(locale, {
          action,
          award_id: awardId,
        });
        setMessage(result.error || (es ? "Guardado." : "Saved."));
      } catch {
        setMessage(
          es ? "No disponible. Reinténtalo." : "Unavailable. Please retry.",
        );
      }
    });
  }
  return (
    <>
      {address && (
        <button
          type="button"
          disabled={pending}
          onClick={() => apply("shipping_delete")}
        >
          {es ? "Eliminar dirección de envío" : "Delete shipping address"}
        </button>
      )}
      {shared && (
        <button
          type="button"
          disabled={pending}
          onClick={() => apply("withdraw")}
        >
          {es ? "Retirar reconocimiento público" : "Withdraw public award"}
        </button>
      )}
      <p role="status">{message}</p>
    </>
  );
}
