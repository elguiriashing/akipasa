import { z } from "zod";
import { config } from "./config";
import { createSupabasePublicClient } from "./supabase/public";
import { languageUrls, publicPagePaths, siteOrigin } from "./seo";

export const sitemapPageSize = 1000;
export type CatalogueKind = "venues" | "events";
const rowSchema = z.object({
  slug: z.string().min(1),
  updated_at: z.string().nullable().optional(),
});
type SitemapRow = z.infer<typeof rowSchema>;
export interface SitemapSource {
  count(kind: CatalogueKind): Promise<number>;
  page(kind: CatalogueKind, page: number): Promise<SitemapRow[]>;
}

// This source deliberately uses anonymous RLS, never a session or service key.
// Events need a public venue and an occurrence, just like the public detail page.
export function createSitemapSource(): SitemapSource {
  if (config.dataProvider === "fixtures") {
    return { count: async () => 0, page: async () => [] };
  }
  function query(kind: CatalogueKind, countOnly = false) {
    const fields =
      kind === "venues"
        ? "slug,updated_at"
        : "slug,venues!inner(status),event_occurrences!event_occurrences_event_id_fkey!inner(id)";
    const builder = createSupabasePublicClient()
      .from(kind)
      .select(fields, countOnly ? { count: "exact", head: true } : undefined)
      .eq("status", "published");
    return kind === "events"
      ? builder.eq("venues.status", "published")
      : builder;
  }
  return {
    async count(kind) {
      const { count, error } = await query(kind, true);
      if (error || count === null)
        throw new Error("Sitemap catalogue count unavailable");
      return count;
    },
    async page(kind, page) {
      const start = page * sitemapPageSize;
      const { data, error } = await query(kind)
        .order("id")
        .range(start, start + sitemapPageSize - 1);
      if (error || !data) throw new Error("Sitemap catalogue page unavailable");
      return z.array(rowSchema).parse(data);
    },
  };
}

function xmlEscape(value: string) {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
}

export function sitemapUrls(
  paths: { path: string; updatedAt?: string | null }[],
) {
  const entries = paths.flatMap(({ path, updatedAt }) => {
    const languages = languageUrls(path);
    const date = updatedAt ? new Date(updatedAt) : null;
    const lastmod =
      date && Number.isFinite(date.getTime())
        ? `<lastmod>${date.toISOString()}</lastmod>`
        : "";
    const alternates = Object.entries(languages)
      .map(
        ([language, href]) =>
          `<xhtml:link rel="alternate" hreflang="${language}" href="${xmlEscape(href)}"/>`,
      )
      .join("");
    return config.locales.map(
      (locale) =>
        `<url><loc>${xmlEscape(languages[locale])}</loc>${lastmod}${alternates}</url>`,
    );
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join("\n")}</urlset>`;
}

function xmlResponse(xml: string) {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function unavailable() {
  // Don't tell Google that the catalogue disappeared during a provider outage.
  return new Response("Sitemap temporarily unavailable. Please retry.", {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "60" },
  });
}

export async function sitemapIndex(sourceFactory = createSitemapSource) {
  try {
    const source = sourceFactory();
    const kinds = ["venues", "events"] as const;
    const counts = await Promise.all(kinds.map((kind) => source.count(kind)));
    const files = [
      "pages.xml",
      ...kinds.flatMap((kind, index) =>
        Array.from(
          { length: Math.ceil(counts[index] / sitemapPageSize) },
          (_, page) => `${kind}-${page}.xml`,
        ),
      ),
    ];
    if (files.length > 50000)
      throw new Error("Sitemap index capacity exceeded");
    return xmlResponse(
      `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${files.map((file) => `<sitemap><loc>${siteOrigin}/sitemap-${file}</loc></sitemap>`).join("\n")}</sitemapindex>`,
    );
  } catch {
    return unavailable();
  }
}

const fileSchema = z.string().regex(/^(venues|events)-(0|[1-9]\d{0,4})\.xml$/);

export async function sitemapFile(
  file: string,
  sourceFactory = createSitemapSource,
) {
  if (file === "pages.xml")
    return xmlResponse(sitemapUrls(publicPagePaths.map((path) => ({ path }))));
  if (!fileSchema.safeParse(file).success)
    return new Response("Not found", { status: 404 });
  const [kind, pageText] = file.replace(".xml", "").split("-");
  try {
    const rows = await sourceFactory().page(
      kind as CatalogueKind,
      Number(pageText),
    );
    if (!rows.length)
      return new Response("Not found", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    return xmlResponse(
      sitemapUrls(
        rows.map((row) => ({
          path: `/${kind}/${encodeURIComponent(row.slug)}`,
          // Occurrence edits do not update events.updated_at, so don't claim a misleading lastmod.
          updatedAt: kind === "venues" ? row.updated_at : undefined,
        })),
      ),
    );
  } catch {
    return unavailable();
  }
}
