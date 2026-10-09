import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { config } from "../lib/config";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  const hq = host === "hq.akipasa.com";
  const business = host === "business.akipasa.com";
  const stay = host === "akiduermo.akipasa.com";
  const name = hq
    ? "AkiHQ"
    : business
      ? "AkiBusiness"
      : stay
        ? "AkiDuermo"
        : config.productName;
  const icon = business ? "business" : stay ? "duermo" : "akipasa";
  const appIcon = hq ? "/pwa/akihq.svg" : "/pwa-icon.svg";
  return {
    id: hq ? "/akihq" : business ? "/akibusiness" : stay ? "/akiduermo" : "/es",
    name,
    short_name: name,
    description: hq
      ? "AkiHQ business operating system."
      : business
        ? "Gestiona tu negocio con AkiBusiness."
        : stay
          ? "Descubre alojamientos con AkiDuermo."
          : "Todo lo que pasa cerca de ti.",
    start_url: hq ? "/" : business ? "/es/business" : stay ? "/" : "/es",
    display: "standalone",
    background_color: hq ? "#10152F" : "#14213d",
    theme_color: hq ? "#7956E8" : business ? "#ffd447" : stay ? "#35c6a6" : "#14213d",
    lang: "es",
    scope: "/",
    categories: hq
      ? ["business", "productivity"]
      : stay
        ? ["travel"]
        : business
          ? ["business"]
          : ["entertainment", "lifestyle", "travel"],
    icons: hq
      ? [
          {
            src: appIcon,
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ]
      : [
          {
            src: appIcon,
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
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
