"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { recordTrustedBehaviour } from "@/lib/personalisation/trusted";

const removalSchema = z.object({
  locale: z.enum(["en", "es"]),
  kind: z.enum(["saved", "following"]),
  key: z.string().min(2).max(160),
  returnTo: z
    .string()
    .regex(/^\/(en|es)\/account\/(saved|following)(\?q=[^&#]{1,720})?$/),
});

function resultHref(returnTo: string, result: "removed" | "error") {
  const url = new URL(returnTo, "https://account.local");
  url.searchParams.set("collection", result);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export async function removeAccountCollectionItem(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = removalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/${locale}/account`);

  const { supabase, user } = await requireUser(locale, parsed.data.returnTo);
  const saved = parsed.data.kind === "saved";
  const { error } = await supabase
    .from(saved ? "saved_event_refs" : "followed_venue_refs")
    .delete()
    .eq("profile_id", user.id)
    .eq(saved ? "event_key" : "venue_key", parsed.data.key);

  if (error) redirect(resultHref(parsed.data.returnTo, "error"));

  await recordTrustedBehaviour({
    eventType: saved ? "event_unsaved" : "venue_unfollowed",
    profileId: user.id,
    entityType: saved ? "event" : "venue",
    entityId: parsed.data.key,
    surface: "account_collection",
  });
  revalidatePath(`/${locale}/account`, "layout");
  redirect(resultHref(parsed.data.returnTo, "removed"));
}
