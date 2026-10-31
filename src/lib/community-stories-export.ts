import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AccountExportEntry } from "./account-export";

const uuid = z
  .string()
  .uuid()
  .transform((id) => id.toLowerCase());
const instant = z.string().datetime({ offset: true });
const story = z
  .object({
    id: uuid,
    checkInId: uuid,
    venueId: uuid,
    cityId: uuid,
    caption: z.string().max(240),
    kind: z.enum(["selfie", "venue"]),
    publicOptIn: z.boolean(),
    status: z.enum(["uploading", "pending", "approved", "rejected"]),
    createdAt: instant,
    expiresAt: instant,
    deletedAt: instant.nullable(),
  })
  .strict();
const report = z
  .object({
    id: uuid,
    reason: z.enum(["unsafe", "privacy", "misleading", "other"]),
    createdAt: instant,
  })
  .strict();
const cleanup = z
  .object({
    id: uuid,
    status: z.literal("pending"),
    createdAt: instant,
  })
  .strict();
const schemas = { stories: story, reports: report, cleanup };
const tables = {
  stories: "community_stories",
  reports: "community_story_reports",
  cleanup: "community_story_media_cleanup",
} as const;
const sections = ["stories", "reports", "cleanup"] as const;
const pageSize = 100;
const rowLimit = 10_000;
const readLimit = 100;

/** Keep enabled while retained Stories data exists, even after collection stops. */
export function communityStoriesExportReady() {
  return process.env.AKIPASA_COMMUNITY_STORIES_SCHEMA_READY === "true";
}

/** Caller-session-only export; never a service-role table read or public feed.
 * Strict projections exclude third-party identifiers, moderation notes and storage
 * paths. mediaRef is an opaque own-story identifier, not a public download URL or
 * a claim that expired/deleted photographs remain available in storage.
 */
export async function readCommunityStoryExports(
  supabase: SupabaseClient,
): Promise<AccountExportEntry[]> {
  const entries: AccountExportEntry[] = [];
  let remainingReads = readLimit;
  for (const section of sections) {
    const rows: Record<string, unknown>[] = [];
    let after: string | null = null;
    let complete = false;
    const pageSchema = z
      .object({
        section: z.literal(section),
        items: z.array(schemas[section]).max(pageSize),
        nextCursor: uuid.nullable(),
        truncated: z.boolean(),
      })
      .strict();
    try {
      while (remainingReads > 0) {
        remainingReads -= 1;
        const response = await supabase.rpc("community_stories_api", {
          p_action: "export",
          p_payload: { section, after, limit: pageSize },
        });
        if (response.error) break;
        const parsed = pageSchema.safeParse(response.data);
        if (!parsed.success) break;
        const page = parsed.data;
        let last: string | null = after;
        let ordered = true;
        for (const item of page.items) {
          if (last !== null && item.id <= last) {
            ordered = false;
            break;
          }
          last = item.id;
        }
        if (!ordered || rows.length + page.items.length > rowLimit) break;
        if (page.truncated) {
          if (page.items.length !== pageSize || page.nextCursor !== last) break;
        } else if (page.nextCursor !== null) break;
        rows.push(
          ...page.items.map((item) =>
            section === "stories"
              ? { ...item, mediaRef: `community-story:${item.id}` }
              : item,
          ),
        );
        if (!page.truncated) {
          complete = true;
          break;
        }
        after = page.nextCursor;
      }
    } catch {
      // An unavailable/malformed/over-budget page cannot yield a partial success.
    }
    entries.push({
      table: tables[section],
      data: complete ? rows : [],
      failed: !complete,
    });
  }
  return entries;
}
