import "server-only";

import { createAIProvider, privacySafeIdentifier } from "@/lib/ai-team/provider";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Locale } from "@/lib/config";

type LocalizedPair = { es: string; en: string };

async function translationModel() {
  const configured = process.env.AKIPASA_TRANSLATION_MODEL?.trim();
  if (configured) return configured;

  const service = createSupabaseServiceClient();
  const { data } = await service
    .from("ai_agents")
    .select("model")
    .eq("enabled", true)
    .eq("provider", "openai")
    .limit(1)
    .maybeSingle();

  if (!data?.model) {
    throw new Error("No translation model is configured");
  }
  return String(data.model);
}

function cleanJson(value: string) {
  return value
    .trim()
    .replace(/^\`\`\`(?:json)?\s*/i, "")
    .replace(/\s*\`\`\`$/, "");
}

export async function translateLocalizedFields(
  sourceLocale: Locale,
  fields: Record<string, string>,
  actorId: string,
): Promise<Record<string, LocalizedPair>> {
  const entries = Object.entries(fields).map(([key, value]) => [
    key,
    value.trim(),
  ]);
  const nonEmpty = Object.fromEntries(entries.filter(([, value]) => value));
  const emptyKeys = entries.filter(([, value]) => !value).map(([key]) => key);

  if (Object.keys(nonEmpty).length === 0) {
    return Object.fromEntries(
      entries.map(([key]) => [key, { es: "", en: "" }]),
    );
  }

  const targetLocale: Locale = sourceLocale === "es" ? "en" : "es";
  const provider = createAIProvider("openai");
  const result = await provider.run({
    model: await translationModel(),
    instructions:
      "You translate user-authored venue content for AkiPasa. Translate faithfully between Spanish and English. Preserve proper nouns, venue/brand names, URLs, phone numbers, emojis, formatting and factual meaning. Do not add marketing claims or extra information. Return ONLY a JSON object with exactly the same keys as the input and string values containing the translations.",
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          source_language: sourceLocale,
          target_language: targetLocale,
          fields: nonEmpty,
        }),
      },
    ],
    tools: [],
    enableWebSearch: false,
    maxOutputTokens: 1600,
    maxProviderRounds: 1,
    safetyIdentifier: await privacySafeIdentifier(actorId),
    executeTool: async () => ({ ok: false }),
  });

  const parsed = JSON.parse(cleanJson(result.text)) as Record<string, unknown>;
  const translated: Record<string, LocalizedPair> = {};

  for (const [key, source] of Object.entries(nonEmpty)) {
    const target = parsed[key];
    if (typeof target !== "string" || !target.trim()) {
      throw new Error(`Missing translation for ${key}`);
    }
    translated[key] =
      sourceLocale === "es"
        ? { es: source, en: target.trim() }
        : { es: target.trim(), en: source };
  }

  for (const key of emptyKeys) translated[key] = { es: "", en: "" };
  return translated;
}
