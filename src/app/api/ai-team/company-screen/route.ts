import { z } from "zod";
import {
  AIAccessError,
  aiErrorResponse,
  requireAIAdministrator,
} from "@/lib/ai-team/auth";
import { POST as resolveAddress } from "../venue-location-resolve/route";

const CRM_ORIGIN = "https://crm.akipasa.com";
const schema = z.object({
  id: z.string().min(2).max(160),
  token: z.string().uuid(),
});
function cors(request: Request, response: Response) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Vary", "Origin");
  if (request.headers.get("origin") === CRM_ORIGIN) {
    response.headers.set("Access-Control-Allow-Origin", CRM_ORIGIN);
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
  }
  return response;
}
export function OPTIONS(request: Request) {
  return cors(
    request,
    new Response(null, {
      status: request.headers.get("origin") === CRM_ORIGIN ? 204 : 403,
    }),
  );
}
export async function POST(request: Request) {
  try {
    // Dedicated first-party CRM endpoint. Cookies alone never authorize this route.
    if (
      request.headers.get("origin") !== CRM_ORIGIN ||
      !/^Bearer\s+\S+/i.test(request.headers.get("authorization") || "")
    ) {
      throw new AIAccessError(
        "Signed-in CRM request required",
        403,
        "invalid_origin",
      );
    }
    const { service } = await requireAIAdministrator(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      return cors(
        request,
        Response.json(
          { message: "Invalid screening request" },
          { status: 400 },
        ),
      );
    const { id, token } = parsed.data;
    const { data: record, error } = await service
      .from("crm_company_records")
      .select("data,revision")
      .eq("workspace_id", "ws_akipasa")
      .eq("id", id)
      .eq("publish_token", token)
      .eq("publish_state", "working")
      .is("deleted_at", null)
      .gt("publish_lease", new Date().toISOString())
      .maybeSingle();
    if (error) throw new Error("Screening record lookup failed");
    if (!record)
      return cors(
        request,
        Response.json({ message: "Screening lease expired" }, { status: 409 }),
      );
    const company = record.data as Record<string, unknown>;
    // Invoke the existing resolver with web research enabled, using the verified user's bearer.
    const origin = new URL(request.url).origin;
    const resolved = await resolveAddress(
      new Request(origin + "/api/ai-team/venue-location-resolve", {
        method: "POST",
        headers: {
          origin,
          authorization: request.headers.get("authorization")!,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: "ws_akipasa",
          researchRequired: true,
          company: {
            id,
            name: company.name,
            address: company.address || "",
            city: company.city || "",
            phone: company.phone || "",
            website: String(company.website || "").slice(0, 300),
          },
        }),
      }),
    );
    if (!resolved.ok) return cors(request, resolved);
    const resolution = (await resolved.json()).data;
    if (
      resolution.status !== "resolved" ||
      resolution.confidence < 0.85 ||
      !resolution.evidenceUrls?.length ||
      !resolution.city
    ) {
      return cors(
        request,
        Response.json({
          ok: true,
          data: {
            status: "insufficient",
            note:
              resolution.note ||
              "No sufficiently supported address found by screening.",
          },
        }),
      );
    }
    const saved = await service.rpc("crm_company_screen_apply", {
      p_id: id,
      p_token: token,
      p_revision: record.revision,
      p_resolution: resolution,
    });
    if (saved.error)
      throw new Error(
        "Screening correction could not be saved; company may have changed.",
      );
    return cors(request, Response.json({ ok: true, data: saved.data }));
  } catch (error) {
    return cors(request, aiErrorResponse(error));
  }
}
