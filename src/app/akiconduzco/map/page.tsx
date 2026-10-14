import { headers } from "next/headers";
import { conduzcoLocale } from "@/lib/akiconduzco-i18n";
import { config } from "@/lib/config";
import { ConduzcoMap } from "@/components/AkiConduzco";
import "maplibre-gl/dist/maplibre-gl.css";

export const metadata = {
  title: "Map · AkiConduzco",
  alternates: { canonical: "https://akiconduzco.akipasa.com/map" },
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [requestHeaders, query] = await Promise.all([headers(), searchParams]);
  return (
    <ConduzcoMap
      locale={conduzcoLocale(requestHeaders.get("x-akipasa-locale"))}
      styleUrl={config.mapStyleUrl}
      initialQuery={query.q || ""}
    />
  );
}
