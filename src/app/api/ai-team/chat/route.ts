import { z } from "zod";
import { aiErrorResponse, requireAIAdministrator } from "@/lib/ai-team/auth";
import { runAIAgent } from "@/lib/ai-team/gateway";
import { requireSameOrigin } from "@/lib/ai-team/request-security";

const chatSchema = z.object({
  agentKey: z.string().regex(/^[a-z][a-z0-9_]{1,31}$/),
  message: z.string().trim().min(1).max(8000),
  allowWebSearch: z.boolean().optional().default(false),
  workspaceId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{2,80}$/)
    .default("ws_akipasa"),
});

export async function POST(request: Request) {
  try {
    await requireSameOrigin(request);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 12_000) {
      return Response.json({ ok: false, error: "too_large" }, { status: 413 });
    }
    const parsed = chatSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: "invalid_request" },
        { status: 400 },
      );
    }
    const { user, service } = await requireAIAdministrator(request);
    const result = await runAIAgent({
      service,
      agentKey: parsed.data.agentKey,
      actorId: user.id,
      message: parsed.data.message,
      requestKind: "chat",
      workspaceId: parsed.data.workspaceId,
      administratorAuthorized: true,
      allowWebSearch: parsed.data.allowWebSearch,
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
