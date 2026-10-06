import "server-only";

import { createAIProvider, privacySafeIdentifier } from "@/lib/ai-team/provider";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Locale } from "@/lib/config";
import {
  catalogueTextHash,
  type CatalogueText,
  type VenueCatalogueDocument,
} from "@/lib/venue-catalogue";

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
  const entries: Array<[string, string]> = Object.entries(fields).map(
    ([key, value]) => [key, value.trim()],
  );
  const nonEmpty: Record<string, string> = Object.fromEntries(
    entries.filter(([, value]) => value.length > 0),
  );
  const emptyKeys = entries
    .filter(([, value]) => value.length === 0)
    .map(([key]) => key);

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
      "You translate user-authored venue content for AkiPasa between Spanish and English. Translate faithfully and naturally. Preserve proper nouns, venue and brand names, URLs, phone numbers, emojis, formatting, prices and factual meaning. For menu/catalogue content, translate descriptive dish, product and service names naturally, but keep genuine brand or proper names unchanged. Never invent ingredients, allergens, claims, opening times or marketing copy. Return ONLY a JSON object with exactly the same keys as the input and string values containing the translations.",
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
    maxOutputTokens: 4000,
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

export async function translateSubmittedLocalizedFields(
  sourceLocale: Locale,
  fields: Record<string, string>,
  actorId: string,
  current: Record<string, LocalizedPair | null | undefined> = {},
): Promise<Record<string, LocalizedPair>> {
  const targetLocale: Locale = sourceLocale === "es" ? "en" : "es";
  const keep: Record<string, LocalizedPair> = {};
  const translateFromSource: Record<string, string> = {};
  const translateFromFallback: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(fields)) {
    const value = rawValue.trim();
    const existing = current[key];
    if (!existing) {
      translateFromSource[key] = value;
      continue;
    }

    const existingSource = existing[sourceLocale]?.trim() || "";
    const existingFallback = existing[targetLocale]?.trim() || "";
    const displayedValue = existingSource || existingFallback;

    if (value !== displayedValue) {
      translateFromSource[key] = value;
      continue;
    }

    if (existingSource) {
      keep[key] = {
        es: existing.es || "",
        en: existing.en || "",
      };
      continue;
    }

    if (existingFallback) {
      translateFromFallback[key] = existingFallback;
      continue;
    }

    translateFromSource[key] = value;
  }

  const [fromSource, fromFallback] = await Promise.all([
    Object.keys(translateFromSource).length
      ? translateLocalizedFields(sourceLocale, translateFromSource, actorId)
      : Promise.resolve({}),
    Object.keys(translateFromFallback).length
      ? translateLocalizedFields(targetLocale, translateFromFallback, actorId)
      : Promise.resolve({}),
  ]);

  return {
    ...keep,
    ...fromSource,
    ...fromFallback,
  };
}

type CatalogueTranslationTarget = {
  pair: CatalogueText;
  maxLength: number;
  sourceLocale: Locale;
  targetLocale: Locale;
  source: string;
  hash: string;
};

function clampTranslatedValue(value: string, maxLength: number) {
  const clean = value.trim();
  if (clean.length <= maxLength) return clean;
  const clipped = clean.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.7 ? clipped.slice(0, lastSpace) : clipped)
    .trimEnd();
}

export async function translateVenueCatalogueDocument(
  sourceLocale: Locale,
  input: VenueCatalogueDocument,
  actorId: string,
): Promise<VenueCatalogueDocument> {
  const document = JSON.parse(
    JSON.stringify(input),
  ) as VenueCatalogueDocument;
  const requestedTargetLocale: Locale = sourceLocale === "es" ? "en" : "es";
  const pending: CatalogueTranslationTarget[] = [];

  const register = (pair: CatalogueText, maxLength: number) => {
    const requestedSource = pair[sourceLocale].trim();
    const fallbackSource = pair[requestedTargetLocale].trim();
    const requestedHash = catalogueTextHash(requestedSource);

    if (
      requestedSource &&
      pair[requestedTargetLocale].trim() &&
      pair._translation?.[`${sourceLocale}Hash`] === requestedHash
    ) {
      return;
    }

    const actualSourceLocale: Locale = requestedSource
      ? sourceLocale
      : fallbackSource
        ? requestedTargetLocale
        : sourceLocale;
    const actualTargetLocale: Locale =
      actualSourceLocale === "es" ? "en" : "es";
    const source = pair[actualSourceLocale].trim();
    const hash = catalogueTextHash(source);

    if (!source) {
      pair.es = "";
      pair.en = "";
      pair._translation = {
        sourceLocale: actualSourceLocale,
        sourceHash: hash,
        esHash: catalogueTextHash(""),
        enHash: catalogueTextHash(""),
      };
      return;
    }

    if (
      pair._translation?.sourceLocale === actualSourceLocale &&
      pair._translation.sourceHash === hash &&
      pair[actualTargetLocale].trim()
    ) {
      pair._translation = {
        sourceLocale: actualSourceLocale,
        sourceHash: hash,
        esHash: catalogueTextHash(pair.es.trim()),
        enHash: catalogueTextHash(pair.en.trim()),
      };
      return;
    }

    pending.push({
      pair,
      maxLength,
      sourceLocale: actualSourceLocale,
      targetLocale: actualTargetLocale,
      source,
      hash,
    });
  };

  register(document.title, 160);
  register(document.description, 1200);

  for (const section of document.sections) {
    register(section.title, 160);
    for (const item of section.items) {
      register(item.name, 160);
      register(item.description, 1200);
      for (const variant of item.variants) register(variant.label, 100);
      register(item.allergens.ingredients, 1200);
      register(item.allergens.notes, 600);
    }
  }

  const translateBatch = async (batch: CatalogueTranslationTarget[]) => {
    if (!batch.length) return;
    const batchSourceLocale = batch[0].sourceLocale;
    if (batch.some((target) => target.sourceLocale !== batchSourceLocale)) {
      throw new Error("Mixed source locales in catalogue translation batch");
    }

    const fields = Object.fromEntries(
      batch.map((target, index) => [`field_${index}`, target.source]),
    );

    try {
      const translated = await translateLocalizedFields(
        batchSourceLocale,
        fields,
        actorId,
      );
      batch.forEach((target, index) => {
        const result = translated[`field_${index}`];
        const translatedValue = result?.[target.targetLocale];
        if (!translatedValue) {
          throw new Error(`Missing catalogue translation field_${index}`);
        }
        target.pair[target.sourceLocale] = target.source;
        target.pair[target.targetLocale] = clampTranslatedValue(
          translatedValue,
          target.maxLength,
        );
        target.pair._translation = {
          sourceLocale: target.sourceLocale,
          sourceHash: target.hash,
          esHash: catalogueTextHash(target.pair.es.trim()),
          enHash: catalogueTextHash(target.pair.en.trim()),
        };
      });
    } catch (error) {
      if (batch.length === 1) throw error;
      const midpoint = Math.ceil(batch.length / 2);
      await translateBatch(batch.slice(0, midpoint));
      await translateBatch(batch.slice(midpoint));
    }
  };

  const translatePendingLocale = async (batchSourceLocale: Locale) => {
    let batch: CatalogueTranslationTarget[] = [];
    let batchCharacters = 0;
    for (const target of pending.filter(
      (item) => item.sourceLocale === batchSourceLocale,
    )) {
      const wouldOverflow =
        batch.length >= 24 || batchCharacters + target.source.length > 8500;
      if (wouldOverflow) {
        await translateBatch(batch);
        batch = [];
        batchCharacters = 0;
      }
      batch.push(target);
      batchCharacters += target.source.length;
    }
    await translateBatch(batch);
  };

  await translatePendingLocale("es");
  await translatePendingLocale("en");

  return document;
}
