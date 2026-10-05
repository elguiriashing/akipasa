import { z } from "zod";
import { previewAccess, privateHeaders, recordPalsAnalytics } from "@/lib/pals/server";

export const dynamic = "force-dynamic";

const eventSchema = z
  .object({
    name: z.enum(["collection_viewed", "item_viewed"]),
    itemId: z.string().min(1).max(80).optional(),
    collectionId: z.string().min(1).max(80).optional(),
  })
  .strict();

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: privateHeaders });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return json({ error: "Invalid origin" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "JSON required" }, 415);
  if (Number(request.headers.get("content-length") || 0) > 1024)
    return json({ error: "Request too large" }, 413);

  let input: z.infer<typeof eventSchema>;
  try {
    const parsed = eventSchema.safeParse(await request.json());
    if (!parsed.success) return json({ error: "Invalid analytics event" }, 400);
    input = parsed.data;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const access = await previewAccess();
  if (!access.user) return json({ error: "Sign in required" }, 401);
  if (!access.allowed) return json({ error: "Not found" }, 404);

  await recordPalsAnalytics(access.user.id, [
    {
      name: input.name,
      occurredAt: new Date().toISOString(),
      itemId: input.itemId,
      collectionId: input.collectionId,
    },
  ]);
  return json({ ok: true });
}
