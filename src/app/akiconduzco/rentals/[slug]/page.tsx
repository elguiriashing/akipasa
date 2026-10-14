import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { RentalDetail } from "@/components/AkiConduzco";
import { conduzcoLocale } from "@/lib/akiconduzco-i18n";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { RentalListing } from "@/lib/akiconduzco";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Rental cars · ${slug.replaceAll("-", " ")} · AkiConduzco`,
    alternates: {
      canonical: `https://akiconduzco.akipasa.com/rentals/${encodeURIComponent(slug)}`,
    },
  };
}

export default async function RentalCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ start?: string; end?: string; vehicle?: string }>;
}) {
  const [{ slug }, query, requestHeaders] = await Promise.all([
    params,
    searchParams,
    headers(),
  ]);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();
  const supabase = createSupabasePublicClient();
  const { data: company } = await supabase
    .from("car_rental_companies")
    .select("id,name,city")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!company) notFound();
  const { data, error } = await supabase.rpc("search_car_rentals", {
    p_q: company.name,
    p_city: company.city,
    p_category: null,
    p_start: query.start || null,
    p_end: query.end || null,
    p_min_price: null,
    p_max_price: null,
    p_bounds: null,
    p_limit: 100,
    p_offset: 0,
  });
  const listings = ((data || []) as RentalListing[]).filter(
    (row) => row.company_id === company.id,
  );
  return (
    <RentalDetail
      locale={conduzcoLocale(requestHeaders.get("x-akipasa-locale"))}
      slug={slug}
      listings={listings}
      error={Boolean(error)}
      requestedVehicle={query.vehicle}
      initialStart={query.start || ""}
      initialEnd={query.end || ""}
    />
  );
}
