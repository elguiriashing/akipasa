import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  requireSameOriginRequest,
  RequestSecurityError,
} from "@/lib/request-security";
import {
  storyIdSchema,
  storyInputSchema,
  storyModerationSchema,
} from "./contracts";
import { storyImageDimensions, STORY_IMAGE_MAX_BYTES } from "./image";
const bucket = "community-stories";
const failure = (code: string, status: number) =>
  NextResponse.json(
    { error: { code, message: code.replaceAll("_", " ") } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function boundedBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw new RequestSecurityError("Payload too large", 413, "invalid_image");
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader)
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > limit) {
        await reader.cancel();
        throw new RequestSecurityError(
          "Payload too large",
          413,
          "invalid_image",
        );
      }
      chunks.push(item.value);
    }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function handleStoryRequest(
  request: Request,
  segments: string[] = [],
) {
  try {
    const mutating = request.method !== "GET";
    if (mutating) requireSameOriginRequest(request);
    if (process.env.AKIPASA_COMMUNITY_STORIES_SCHEMA_READY !== "true")
      return failure("unavailable", 503);
    if (
      request.method === "POST" &&
      segments.length === 0 &&
      process.env.AKIPASA_COMMUNITY_STORIES_ENABLED !== "true"
    )
      return failure("collection_paused", 503);
    const db = await createSupabaseServerClient();
    if (
      mutating ||
      ["mine", "moderation", "check-ins"].includes(segments[0] || "")
    ) {
      const { data, error } = await db.auth.getUser();
      if (error || !data.user) return failure("authentication_required", 401);
    }
    const rpc = async (
      action: string,
      payload: Record<string, unknown> = {},
    ) => {
      const { data, error } = await db.rpc("community_stories_api", {
        p_action: action,
        p_payload: payload,
      });
      if (error) {
        const status =
          error.code === "42501"
            ? 403
            : error.code === "23505"
              ? 409
              : error.code === "P0001"
                ? 429
                : error.code === "22023"
                  ? 400
                  : 503;
        throw new RequestSecurityError(
          "Story operation failed",
          status,
          status === 403
            ? "not_eligible"
            : status === 409
              ? "already_shared"
              : status === 429
                ? "rate_limited"
                : status === 400
                  ? "invalid_input"
                  : "unavailable",
        );
      }
      return data;
    };
    // Public catalogue/feed reads use the ordinary caller session. Private and
    // mutation paths retain their existing RPC and authorization boundaries.
    const publicRead = async (
      name: "community_story_city_catalog" | "community_story_city_feed",
      args: Record<string, string>,
    ) => {
      const { data, error } = await db.rpc(name, args);
      if (error || !data)
        throw new RequestSecurityError(
          "Story read unavailable",
          error?.code === "22023" ? 400 : 503,
          error?.code === "22023" ? "invalid_input" : "unavailable",
        );
      return data;
    };
    const cleanupMedia = async (id: string): Promise<"removed" | "pending"> => {
      try {
        const { error } = await createSupabaseServiceClient()
          .storage.from(bucket)
          .remove([`${id}.webp`]);
        if (error) return "pending";
        const confirmed = await rpc("cleanup-complete", { id });
        return confirmed?.removed === true ? "removed" : "pending";
      } catch {
        return "pending";
      }
    };
    const url = new URL(request.url);
    if (request.method === "GET") {
      if (segments.length === 0) {
        const city = z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .max(100)
          .safeParse(url.searchParams.get("city"));
        if (
          !city.success ||
          url.searchParams.getAll("city").length !== 1 ||
          [...url.searchParams.keys()].some((key) => key !== "city")
        )
          return failure("invalid_input", 400);
        return response(
          await publicRead("community_story_city_feed", { p_city: city.data }),
        );
      }
      if (segments.length === 1 && segments[0] === "cities") {
        const area = z
          .string()
          .trim()
          .min(1)
          .max(100)
          .regex(/^[^\u0000-\u001f\u007f]+$/)
          .safeParse(url.searchParams.get("area") ?? "fuengirola");
        if (
          !area.success ||
          url.searchParams.getAll("area").length > 1 ||
          [...url.searchParams.keys()].some((key) => key !== "area")
        )
          return failure("invalid_input", 400);
        return response(
          await publicRead("community_story_city_catalog", {
            p_area: area.data,
          }),
        );
      }
      if (
        segments.length === 1 &&
        ["mine", "check-ins", "moderation"].includes(segments[0])
      ) {
        const queue = url.searchParams.get("queue") || "pending";
        if (
          segments[0] === "moderation" &&
          !["pending", "reported"].includes(queue)
        )
          return failure("invalid_input", 400);
        return response(await rpc(segments[0], { queue }));
      }
      if (
        segments.length === 2 &&
        segments[1] === "media" &&
        storyIdSchema.safeParse(segments[0]).success
      ) {
        if (!(await rpc("media", { id: segments[0] })))
          return failure("not_found", 404);
        const { data, error } = await createSupabaseServiceClient()
          .storage.from(bucket)
          .download(`${segments[0]}.webp`);
        if (error || !data) return failure("unavailable", 503);
        return new Response(data, {
          headers: {
            "Content-Type": "image/webp",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
            "Content-Disposition": "inline",
          },
        });
      }
    }
    if (request.method === "POST" && segments.length === 0) {
      const bytes = await boundedBody(request, STORY_IMAGE_MAX_BYTES + 16384);
      const multipart = new Request(request.url, {
        method: "POST",
        headers: { "content-type": request.headers.get("content-type") || "" },
        body: bytes,
      });
      let form: FormData;
      try {
        form = await multipart.formData();
      } catch {
        return failure("invalid_input", 400);
      }
      if (
        [...form.keys()].some(
          (key) =>
            !["checkInId", "kind", "caption", "publicOptIn", "file"].includes(
              key,
            ),
        ) ||
        ["checkInId", "kind", "caption", "publicOptIn", "file"].some(
          (key) => form.getAll(key).length !== 1,
        )
      )
        return failure("invalid_input", 400);
      if (form.get("publicOptIn") !== "true")
        return failure("public_opt_in_required", 403);
      const input = storyInputSchema.safeParse(
        Object.fromEntries(
          ["checkInId", "kind", "caption", "publicOptIn"].map((key) => [
            key,
            form.get(key),
          ]),
        ),
      );
      if (!input.success) return failure("invalid_input", 400);
      const file = form.get("file");
      if (
        !(file instanceof File) ||
        file.type !== "image/webp" ||
        file.size > STORY_IMAGE_MAX_BYTES
      )
        return failure("invalid_image", 400);
      const image = new Uint8Array(await file.arrayBuffer());
      if (!storyImageDimensions(image)) return failure("invalid_image", 400);
      const service = createSupabaseServiceClient();
      const reserved = await rpc("reserve", input.data);
      if (!reserved?.id || !storyIdSchema.safeParse(reserved.id).success)
        return failure("unavailable", 503);
      const path = `${reserved.id}.webp`;
      try {
        const { error } = await service.storage
          .from(bucket)
          .upload(path, image, {
            contentType: "image/webp",
            upsert: false,
            cacheControl: "0",
          });
        if (error) throw new Error("Story storage unavailable");
        return response(await rpc("finalize", { id: reserved.id }), 201);
      } catch {
        let mediaCleanup: "removed" | "pending" = "pending";
        try {
          // Abort records a durable cleanup task and retains the rate-limit attempt.
          // A concurrently finalized/approved row cannot be aborted or lose its image.
          await rpc("abort", { id: reserved.id });
          mediaCleanup = await cleanupMedia(reserved.id);
        } catch {
          /* Access remains unpublished; a finalized row retains its image. */
        }
        return response(
          {
            error: { code: "unavailable", message: "Story upload unavailable" },
            mediaCleanup,
          },
          503,
        );
      }
    }
    if (segments.length >= 1 && storyIdSchema.safeParse(segments[0]).success) {
      const id = segments[0];
      if (request.method === "DELETE" && segments.length === 1) {
        const result = await rpc("delete", { id });
        if (!result) return failure("not_found", 404);
        const mediaCleanup = await cleanupMedia(id);
        return response({ ...result, mediaCleanup });
      }
      if (
        request.method === "POST" &&
        segments.length === 2 &&
        ["report", "moderate"].includes(segments[1])
      ) {
        const bytes = await boundedBody(request, 2048);
        const json = JSON.parse(new TextDecoder().decode(bytes));
        const parsed =
          segments[1] === "moderate"
            ? storyModerationSchema.safeParse(json)
            : z
                .object({
                  reason: z.enum(["unsafe", "privacy", "misleading", "other"]),
                })
                .strict()
                .safeParse(json);
        if (!parsed.success) return failure("invalid_input", 400);
        const data = await rpc(segments[1], { id, ...parsed.data });
        if (!data) return failure("not_found", 404);
        if (
          segments[1] === "moderate" &&
          "decision" in parsed.data &&
          parsed.data.decision === "remove"
        ) {
          return response({ ...data, mediaCleanup: await cleanupMedia(id) });
        }
        return response(data);
      }
    }
    return failure("not_found", 404);
  } catch (error) {
    if (error instanceof RequestSecurityError)
      return failure(error.code, error.status);
    if (error instanceof SyntaxError) return failure("invalid_input", 400);
    return failure("unavailable", 503);
  }
}
