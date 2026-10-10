import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { config } from "../lib/config";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  const business = host === "business.akipasa.com";
  const stay = host === "akiduermo.akipasa.com";
  const name = business
    ? "AkiBusiness"
    : stay
      ? "AkiDuermo"
      : config.productName;
  const icon = business ? "business" : stay ? "duermo" : "akipasa";
  return {
    id: business ? "/akibusiness" : stay ? "/akiduermo" : "/es",
    name,
    short_name: name,
    description: business
      ? "Gestiona tu negocio con AkiBusiness."
      : stay
        ? "Descubre alojamientos con AkiDuermo."
        : "Todo lo que pasa cerca de ti.",
    start_url: business ? "/es/business" : stay ? "/" : "/es",
    display: "standalone",
    background_color: business ? "#192b48" : stay ? "#143c43" : "#14213d",
    theme_color: business ? "#ffd447" : stay ? "#35c6a6" : "#14213d",
    lang: "es",
    scope: "/",
    categories: stay
      ? ["travel"]
      : business
        ? ["business"]
        : ["entertainment", "lifestyle", "travel"],
    icons: [
      ...(business || stay
        ? []
        : [
            {
              src: "/pwa-icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any" as const,
            },
          ]),
      ...([192, 512] as const).flatMap((size) => [
        {
          src: `/pwa/${icon}-${size}.png`,
          sizes: `${size}x${size}`,
          type: "image/png",
          purpose: "any" as const,
        },
        {
          src: `/pwa/${icon}-maskable-${size}.png`,
          sizes: `${size}x${size}`,
          type: "image/png",
          purpose: "maskable" as const,
        },
      ]),
    ],
  };
}
