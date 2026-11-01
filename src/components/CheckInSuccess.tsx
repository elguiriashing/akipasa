import { z } from "zod";
import type { Locale } from "@/lib/config";
import { createSupabaseServerClient } from "../lib/supabase/server";
import styles from "./CheckInSuccess.module.css";

/** Query-string outcomes never establish proof: show success only for an owned,
 * accepted visit returned through the normal authenticated/RLS client. */
export async function CheckInSuccess({
  locale,
  checkInId,
  profileId,
}: {
  locale: Locale;
  checkInId?: string;
  profileId: string;
}) {
  if (!z.string().uuid().safeParse(checkInId).success) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: visit, error } = await supabase
      .from("check_ins")
      .select("id,state,distance_meters")
      .eq("id", checkInId!)
      .eq("profile_id", profileId)
      .eq("state", "accepted")
      .maybeSingle();
    if (error || !visit || visit.state !== "accepted" || visit.id !== checkInId)
      return null;
    const es = locale === "es";
    const distance =
      typeof visit.distance_meters === "number" &&
      Number.isFinite(visit.distance_meters) &&
      visit.distance_meters >= 0
        ? Math.round(visit.distance_meters)
        : null;
    return (
      <section className={styles.success} role="status" aria-live="polite">
        <span className={styles.seal} aria-hidden="true">
          ✓
        </span>
        <div>
          <p className={styles.eyebrow}>
            {es ? "Visita verificada" : "Visit verified"}
          </p>
          <h2>{es ? "¡Ya estás dentro!" : "You’re checked in!"}</h2>
          <p>
            {es
              ? "Tu visita ha sido aceptada. Sigue creando buenos momentos."
              : "Your visit has been accepted. Here’s to another great moment."}
          </p>
          <p>
            {distance !== null ? (
              <>
                {es
                  ? "Ubicación confirmada por el servidor."
                  : "Location confirmed by the server."}{" "}
                {es ? "Distancia comprobada" : "Verified distance"}: {distance}{" "}
                m.
              </>
            ) : es ? (
              "Los detalles de distancia no están disponibles para este recibo."
            ) : (
              "Distance details are unavailable for this receipt."
            )}
          </p>
        </div>
      </section>
    );
  } catch {
    // Optional receipt presentation must not make Passport unavailable.
    return null;
  }
}
