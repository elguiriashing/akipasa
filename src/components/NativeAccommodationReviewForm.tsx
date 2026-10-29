"use client";
import { useId, useState } from "react";
import { reviewNativeAccommodation } from "@/app/[locale]/admin/accommodation-review/actions";
import styles from "./NativeReviewSurfaces.module.css";
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
  const reasonId = useId();
  const helpId = `${reasonId}-help`;
  const errorId = `${reasonId}-error`;
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
    <form
      className={styles.reviewForm}
      onSubmit={(e) => e.preventDefault()}
      aria-busy={busy}
    >
      <fieldset className={styles.fieldset} disabled={busy || applied}>
        <legend>{es ? "Revisar esta versión" : "Review this revision"}</legend>
        <label className={styles.reasonLabel} htmlFor={reasonId}>
          {es ? "Motivo de la revisión" : "Review reason"}
        </label>
        <textarea
          id={reasonId}
          className={styles.reasonInput}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-describedby={error ? `${helpId} ${errorId}` : helpId}
          aria-invalid={error === "invalid"}
          minLength={10}
          maxLength={2000}
          rows={4}
          required
        />
        <p className={styles.help} id={helpId}>
          {es
            ? "Explica la decisión en 10–2000 caracteres. El motivo quedará registrado con la revisión."
            : "Explain the decision in 10–2000 characters. The reason is recorded with the review."}
        </p>
        <div className={styles.actions}>
          <button
            className={styles.primaryAction}
            type="button"
            disabled={reason.trim().length < 10}
            onClick={() => void apply(true)}
          >
            {es ? "Aprobar publicación" : "Approve publication"}
          </button>
          <button
            className={styles.secondaryAction}
            type="button"
            disabled={reason.trim().length < 10}
            onClick={() => void apply(false)}
          >
            {es ? "Rechazar publicación" : "Reject publication"}
          </button>
        </div>
      </fieldset>
      {busy && (
        <p className={styles.notice} role="status">
          {es ? "Registrando la revisión…" : "Recording the review…"}
        </p>
      )}
      {error && (
        <p className={styles.error} id={errorId} role="alert">
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
        <p className={styles.success} role="status">
          {es ? "Revisión registrada." : "Review recorded."}
        </p>
      )}
    </form>
  );
}
