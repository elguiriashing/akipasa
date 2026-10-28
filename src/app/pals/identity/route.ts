import { z } from "zod";
import {
  appearanceSchema,
  DEFAULT_APPEARANCE,
  renderHumanAvatar,
} from "@/lib/pals/avatar-v2";
import { previewAccess, privateHeaders } from "@/lib/pals/server";

export const dynamic = "force-dynamic";

const actionSchema = z
  .object({
    appearance: appearanceSchema,
    save: z.boolean(),
  })
  .strict();

function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateHeaders });
}

export async function GET() {
  try {
    const access = await previewAccess();
    if (!access.user)
      return reply({ error: "Sign in to access the private preview." }, 401);
    if (!access.allowed) return reply({ error: "Not found" }, 404);
    const { data, error } = await access.supabase
      .from("pals_avatar_profiles")
      .select("appearance")
      .eq("user_id", access.user.id)
      .maybeSingle();
    if (error) throw new Error("Avatar storage unavailable");
    const parsed = appearanceSchema.safeParse(data?.appearance);
    const appearance = parsed.success ? parsed.data : DEFAULT_APPEARANCE;
    return reply({
      appearance,
      portrait: renderHumanAvatar(appearance),
      saved: Boolean(data),
    });
  } catch {
    return reply(
      { error: "The avatar studio is temporarily unavailable." },
      503,
    );
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    origin !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return reply({ error: "Cross-site edits are not allowed." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return reply({ error: "JSON required" }, 415);
  }
  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return reply({ error: "Request too large" }, 413);
  }
  let body = "";
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "JSON required" }, 400);
    const decoder = new TextDecoder();
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 4096) {
        await reader.cancel();
        return reply({ error: "Request too large" }, 413);
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
  } catch {
    return reply({ error: "Invalid request body" }, 400);
  }
  let action: z.infer<typeof actionSchema>;
  try {
    action = actionSchema.parse(JSON.parse(body));
  } catch {
    return reply({ error: "Invalid appearance settings" }, 400);
  }
  try {
    const access = await previewAccess();
    if (!access.user)
      return reply({ error: "Sign in to access the private preview." }, 401);
    if (!access.allowed) return reply({ error: "Not found" }, 404);
    if (action.save) {
      const { error } = await access.supabase
        .from("pals_avatar_profiles")
        .upsert(
          {
            user_id: access.user.id,
            appearance: action.appearance,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      if (error) throw new Error("Saving appearance failed");
    }
    return reply({
      appearance: action.appearance,
      portrait: renderHumanAvatar(action.appearance),
      saved: action.save,
    });
  } catch {
    return reply(
      {
        error:
          "The studio could not confirm this change. Your previous saved look is untouched.",
      },
      503,
    );
  }
}
