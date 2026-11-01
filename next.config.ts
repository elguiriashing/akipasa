import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isDevelopment = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com/beacon.min.js https://static.cloudflareinsights.com/beacon.min.js/${
    isDevelopment ? " 'unsafe-eval'" : ""
  }`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://akipasa.supabase.co https://tiles.openfreemap.org https://tile.openstreetmap.org https://*.google-analytics.com https://*.analytics.google.com https://pagead2.googlesyndication.com https://www.googleadservices.com https://www.google.com https://www.google.es",
  "font-src 'self' data:",
  "connect-src 'self' https://akipasa.supabase.co wss://akipasa.supabase.co https://tiles.openfreemap.org https://tile.openstreetmap.org https://*.google-analytics.com https://*.analytics.google.com https://pagead2.googlesyndication.com https://www.googleadservices.com https://www.google.com https://www.google.es",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  async redirects() {
    // Shared product privacy links must also work without an account session.
    return [
      {
        source: "/:locale(en|es)/account-deletion",
        destination: "/:locale/privacy#account-deletion",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    // Keep sitemap files at the site root so robots discovery covers all URLs,
    // even before the sitemap is submitted in Search Console.
    return [{ source: "/sitemap-:file", destination: "/sitemaps/:file" }];
  },
  typedRoutes: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  allowedDevOrigins: ["127.0.0.1"],
  webpack: (webpackConfig, { isServer }) => {
    if (isServer) {
      webpackConfig.resolve.alias["maplibre-gl"] = false;
    }
    return webpackConfig;
  },
  images: {
    // Preserve the pre-upgrade one-minute image-cache minimum.
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "akipasa.supabase.co",
        pathname: "/storage/v1/object/sign/event-media/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
      {
        // This existing scanner asks for video only after the user's Scan action.
        // Preserve global denial elsewhere and microphone/payment denial here.
        source: "/:locale(en|es)/check-in",
        headers: [
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(), geolocation=(self), payment=()",
          },
        ],
      },
      {
        source: "/pals/world/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // Embedded GLB textures are fetched as same-document blob URLs by
            // Three's ImageBitmapLoader. Keep this allowance on private World.
            value: contentSecurityPolicy.replace(
              "connect-src 'self' ",
              "connect-src 'self' blob: ",
            ),
          },
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "CDN-Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      // Place token-bearing confirmation override LAST: Next.js uses the last
      // matching header key, so the global Referrer-Policy must not win.
      // Confirmation URLs contain single-use verification tokens.
      // Prevent caching, indexing, and Referer leakage from email links.
      {
        source: "/waitlist/confirm",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
