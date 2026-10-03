import { z } from "zod";
import {
  applyAction,
  RuleError,
  type Context,
  type EarnedAchievement,
} from "@/lib/pals/engine";
import { previewAccess, privateHeaders, readState } from "@/lib/pals/server";
import { payload } from "@/lib/pals/view";

export const dynamic = "force-dynamic";
const family = z.enum([
  "brasa",
  "moka",
  "tapo",
  "lux",
  "musa",
  "lupa",
  "rayo",
  "nube",
  "chispa",
  "brote",
]);
const stat = z.enum(["wits", "energy", "charm"]);
const slot = z.enum(["head", "body", "back", "held"]);
const id = z.string().min(1).max(80);
const actionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("adopt"),
      family,
      name: z.string().min(1).max(24),
    })
    .strict(),
  z
    .object({ type: z.literal("rename"), name: z.string().min(1).max(24) })
    .strict(),
  z.object({ type: z.literal("family"), family }).strict(),
  z.object({ type: z.literal("equip"), itemId: id }).strict(),
  z.object({ type: z.literal("upgrade"), itemId: id }).strict(),
  z.object({ type: z.literal("socket"), itemId: id }).strict(),
  z.object({ type: z.literal("scrap"), itemId: id }).strict(),
  z.object({ type: z.literal("unequip"), slot }).strict(),
  z
    .object({
      type: z.literal("module"),
      itemId: id,
      index: z.number().int().min(0).max(2),
      stat: stat.nullable(),
    })
    .strict(),
  z.object({ type: z.literal("merge"), itemId: id, duplicateId: id }).strict(),
  z
    .object({ type: z.literal("appearance"), itemId: id, appearance: id })
    .strict(),
  z.object({ type: z.literal("parcel") }).strict(),
  z.object({ type: z.literal("claim") }).strict(),
  z.object({ type: z.literal("leave") }).strict(),
  z.object({ type: z.literal("buy"), sku: id }).strict(),
  z.object({ type: z.literal("start"), adventure: id }).strict(),
  z
    .object({
      type: z.literal("choice"),
      index: z.number().int().min(0).max(2),
    })
    .strict(),
  z.object({ type: z.literal("map"), enabled: z.boolean() }).strict(),
  z.object({ type: z.literal("goal"), sku: id.nullable() }).strict(),
]);
const commandSchema = z
  .object({
    id: z.string().uuid(),
    version: z.number().int().min(0),
    action: actionSchema,
  })
  .strict();
function json(value: unknown, status = 200) {
  const state =
    value && typeof value === "object" && "state" in value
      ? (value as { state: { mapEnabled?: boolean } }).state
      : null;
  return Response.json(value, {
    status,
    headers: {
      ...privateHeaders,
      ...(state
        ? {
            "Set-Cookie": `akipals_preview=${state.mapEnabled ? "1" : ""}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${state.mapEnabled ? 7776000 : 0}`,
          }
        : {}),
    },
  });
}

export async function GET() {
  try {
    const access = await previewAccess();
    if (!access.user)
      return json(
        { error: "Sign in to your team account to open this private preview." },
        401,
      );
    if (!access.allowed) return json({ error: "Not found" }, 404);
    const saved = await readState(access.user.id, true);
    if (!saved) throw new Error("Preview save unavailable");
    return json(payload(saved.state, saved.version, true));
  } catch {
    return json(
      {
        error:
          "Your saved preview is temporarily unavailable. Please retry; existing progress has not been reset.",
      },
      503,
    );
  }
}

export async function POST(request: Request) {
  // Reject cross-site writes before touching authentication or game state.
  const origin = request.headers.get("origin");
  if (
    !origin ||
    origin !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return json(
      { error: "This action must come from your AkiPals preview." },
      403,
    );
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "JSON required" }, 415);
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return json({ error: "Request too large" }, 413);
  let parsed: z.infer<typeof commandSchema>;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "JSON required" }, 400);
    const decoder = new TextDecoder();
    let body = "";
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 4096) {
        await reader.cancel();
        return json({ error: "Request too large" }, 413);
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    const result = commandSchema.safeParse(JSON.parse(body));
    if (!result.success)
      return json(
        { error: "Invalid preview action. Refresh and try again." },
        400,
      );
    parsed = result.data;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  try {
    const access = await previewAccess();
    if (!access.user)
      return json({ error: "Your session has expired. Sign in again." }, 401);
    if (!access.allowed) return json({ error: "Not found" }, 404);
    const saved = await readState(access.user.id);
    if (!saved)
      return json({ error: "Load your preview before making changes." }, 409);
    const { data: existing, error: commandError } = await saved.db
      .from("pals_commands")
      .select("command_id")
      .eq("user_id", access.user.id)
      .eq("command_id", parsed.id)
      .maybeSingle();
    if (commandError) throw new Error("Command ledger unavailable");
    if (existing) return json(payload(saved.state, saved.version));
    if (saved.version !== parsed.version)
      return json(
        {
          ...payload(saved.state, saved.version),
          error:
            "Your collection changed in another tab or device. The latest save is loaded; try the action again.",
        },
        409,
      );
    const { count, error: rateError } = await saved.db
      .from("pals_commands")
      .select("command_id", { head: true, count: "exact" })
      .eq("user_id", access.user.id)
      .gte("created_at", new Date(Date.now() - 60000).toISOString());
    if (rateError) throw new Error("Rate check unavailable");
    if ((count ?? 0) >= 90)
      return json(
        { error: "A lot of little changes at once. Please wait a minute." },
        429,
      );
    const context: Context = {
      now: Date.now(),
      id: () => crypto.randomUUID(),
      random: () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
    };
    if (parsed.action.type === "claim") {
      const { data, error } = await access.supabase.rpc(
        "my_achievement_progress",
      );
      if (error || !Array.isArray(data))
        return json(
          {
            error:
              "Verified achievements could not be loaded. No keepsakes have been changed.",
          },
          503,
        );
      context.achievements = data as EarnedAchievement[];
    }
    let state;
    try {
      state = applyAction(saved.state, parsed.action, context);
    } catch (error) {
      if (error instanceof RuleError)
        return json(
          { ...payload(saved.state, saved.version), error: error.message },
          400,
        );
      throw error;
    }
    const { data: committed, error } = await saved.db.rpc("pals_commit", {
      p_user_id: access.user.id,
      p_command_id: parsed.id,
      p_expected_version: saved.version,
      p_state: state,
    });
    if (error) throw new Error("Atomic save unavailable");
    if (!committed) {
      const latest = await readState(access.user.id);
      return json(
        {
          ...(latest ? payload(latest.state, latest.version) : {}),
          error:
            "Another change was saved first. Your latest collection is loaded; try again.",
        },
        409,
      );
    }
    return json(payload(committed.state, committed.version));
  } catch {
    return json(
      {
        error:
          "The server could not confirm this save. Retry the same request safely; your progress will not be reset.",
      },
      503,
    );
  }
}
