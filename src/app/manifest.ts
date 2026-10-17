import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { config } from "../lib/config";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  const business = host === "business.akipasa.com";
  const stay = host === "akiduermo.akipasa.com";
  const conduzco = host === "akiconduzco.akipasa.com";
  const name = conduzco
    ? "AkiConduzco"
    : business
      ? "AkiBusiness"
      : stay
        ? "AkiDuermo"
        : config.productName;
  const icon = business ? "business" : stay ? "duermo" : "akipasa";
  return {
    id: business
      ? "/akibusiness"
      : stay
        ? "/akiduermo"
        : conduzco
          ? "/akiconduzco"
          : "/es",
    name,
    short_name: name,
    description: conduzco
      ? "Encuentra coches de alquiler para tu viaje."
      : business
        ? "Gestiona tu negocio con AkiBusiness."
        : stay
          ? "Descubre alojamientos con AkiDuermo."
          : "Todo lo que pasa cerca de ti.",
    start_url: business ? "/es/business" : stay || conduzco ? "/" : "/es",
    display: "standalone",
    background_color: conduzco
      ? "#FFFFFF"
      : business
        ? "#192b48"
        : stay
          ? "#143c43"
          : "#14213d",
    theme_color: conduzco
      ? "#FF3047"
      : business
        ? "#ffd447"
        : stay
          ? "#35c6a6"
          : "#14213d",
    lang: "es",
    scope: "/",
    categories: conduzco
      ? ["travel", "navigation"]
      : stay
        ? ["travel"]
        : business
          ? ["business"]
          : ["entertainment", "lifestyle", "travel"],
    icons: [
      ...(conduzco
        ? [
            {
              src: "/brand/conduzco-icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any" as const,
            },
            {
              src: "/brand/conduzco-maskable.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "maskable" as const,
            },
          ]
        : []),
      ...(business || stay || conduzco
        ? []
        : [
            {
              src: "/pwa-icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any" as const,
            },
          ]),
      ...(!conduzco
        ? ([192, 512] as const).flatMap((size) => [
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
          ])
        : []),
    ],
  };
}
