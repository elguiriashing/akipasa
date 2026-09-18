// Production is intercepted by custom-worker.ts and served from the shared
// Durable Object + edge cache. Local Next dev stays explicit, not an uncached
// fallback that could silently hammer the database in production.
export async function GET() {
  return Response.json(
    { error: "Use the Cloudflare preview for the map snapshot" },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
