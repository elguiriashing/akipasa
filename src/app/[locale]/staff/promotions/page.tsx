import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { canModerate } from "@/lib/roles";
import {
  StaffPromotionsInbox,
  type StaffPromotion,
} from "./StaffPromotionsInbox";
import "./staff-promotions.css";

export default async function StaffPromotionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(
    locale,
    "/" + locale + "/staff/promotions",
  );
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !canModerate(profile.app_role)) notFound();

  const { data, error } = await supabase
    .from("promotion_requests")
    .select("id,service,message,state,operator_notes,created_at,venues(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  const es = locale === "es";
  if (error) {
    return (
      <section
        className="staff-promotions-page staff-promotions-error"
        role="alert"
      >
        <h1>
          {es
            ? "No se pudieron cargar las promociones"
            : "Could not load promotions"}
        </h1>
        <p>
          {es
            ? "No podemos consultar las solicitudes ahora. Inténtalo de nuevo más tarde."
            : "The requests are unavailable right now. Please try again later."}
        </p>
      </section>
    );
  }

  const requests: StaffPromotion[] = (data || []).map((item) => {
    const rawVenue = item.venues as unknown;
    const venue = (Array.isArray(rawVenue) ? rawVenue[0] : rawVenue) as
      | { name?: string | null }
      | null
      | undefined;
    return {
      id: item.id,
      venueName: venue?.name || null,
      service: item.service,
      message: item.message,
      state: item.state,
      operatorNotes: item.operator_notes,
      createdAt: item.created_at,
    };
  });

  return <StaffPromotionsInbox locale={locale} requests={requests} />;
}
