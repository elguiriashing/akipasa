import { relevanceAdministrator } from "@/lib/venue-relevance-admin";
import {
  relevanceDecisionSchema,
  relevanceFilterSchema,
} from "@/lib/venue-relevance";

const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  const admin = await relevanceAdministrator();
  if ("error" in admin)
    return Response.json(
      { error: admin.error },
      { status: admin.status, headers },
    );
  const parsed = relevanceFilterSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return Response.json(
      { error: "Invalid review filter" },
      { status: 400, headers },
    );
  const { data, error } = await admin.service.rpc(
    "admin_venue_relevance_page",
    {
      p_actor: admin.user.id,
      p_search: parsed.data.q,
      p_action: parsed.data.action,
      p_offset: parsed.data.offset,
    },
  );
  if (error)
    return Response.json(
      { error: "Review queue temporarily unavailable" },
      { status: 503, headers },
    );
  return Response.json(data, { headers });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "Same-origin request required" },
      { status: 403, headers },
    );
  const admin = await relevanceAdministrator();
  if ("error" in admin)
    return Response.json(
      { error: admin.error },
      { status: admin.status, headers },
    );
  const parsed = relevanceDecisionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      {
        error:
          "Choose a valid decision and give a reason of at least 10 characters",
      },
      { status: 400, headers },
    );
  const p = parsed.data;
  const { data, error } = await admin.service.rpc(
    "admin_resolve_venue_relevance",
    {
      p_actor: admin.user.id,
      p_venue: p.venueId,
      p_action: p.action,
      p_weight: p.weight,
      p_fingerprint: p.fingerprint,
      p_reason: p.reason,
    },
  );
  if (error)
    return Response.json(
      {
        error:
          error.code === "PT409" || error.code === "40001"
            ? "This listing changed. Refresh before reviewing."
            : "Decision could not be saved",
      },
      {
        status: error.code === "PT409" || error.code === "40001" ? 409 : 503,
        headers,
      },
    );
  return Response.json(data, { headers });
}
