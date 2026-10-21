"use client";
import { useState } from "react";
import { reviewNativeAccommodation } from "@/app/[locale]/admin/accommodation-review/actions";
export function NativeAccommodationReviewForm({
  property,
  revision,
  locale,
}: {
  property: string;
  revision: string;
  locale: "en" | "es";
}) {
  const es = locale === "es";
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [applied, setApplied] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function apply(publish: boolean) {
    if (busy || applied) return;
    setBusy(true);
    setError(null);
    try {
      const result = await reviewNativeAccommodation({
        property,
        revision,
        locale,
        publish,
        reason,
      });
      if (result.ok) setApplied(true);
      else setError(result.error ?? "unavailable");
    } catch {
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <fieldset disabled={busy || applied}>
        <legend>{es ? "Revisar esta versión" : "Review this revision"}</legend>
        <label>
          {es ? "Motivo de la revisión" : "Review reason"}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={10}
            maxLength={2000}
            required
          />
        </label>
        <button
          type="button"
          disabled={reason.trim().length < 10}
          onClick={() => void apply(true)}
        >
          {es ? "Aprobar publicación" : "Approve publication"}
        </button>
        <button
          type="button"
          disabled={reason.trim().length < 10}
          onClick={() => void apply(false)}
        >
          {es ? "Rechazar publicación" : "Reject publication"}
        </button>
      </fieldset>
      {error && (
        <p role="alert">
          {error === "stale"
            ? es
              ? "La ficha ha cambiado. Recarga y revisa la versión actual. Tu motivo se conserva."
              : "The listing changed. Reload and review its current revision. Your reason is retained."
            : es
              ? "No se pudo aplicar la revisión. Tu motivo se conserva; comprueba los permisos y reintenta."
              : "Could not apply the review. Your reason is retained; check access and retry."}
        </p>
      )}
      {applied && (
        <p role="status">{es ? "Revisión registrada." : "Review recorded."}</p>
      )}
    </form>
  );
}
