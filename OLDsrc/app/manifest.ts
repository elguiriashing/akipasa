import type { MetadataRoute } from "next";
import { config } from "@/lib/config";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: config.productName,
    short_name: config.productName,
    description: "Todo lo que pasa cerca de ti.",
    start_url: "/es",
    display: "standalone",
    background_color: "#fff7e8",
    theme_color: "#075e54",
    lang: "es",
    scope: "/",
    categories: ["entertainment", "lifestyle", "travel"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Discover",
        short_name: "Discover",
        description: "See events and venues near you.",
        url: "/es",
      },
    ],
  };
}
