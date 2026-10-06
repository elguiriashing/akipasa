import "server-only";

import type { Locale } from "@/lib/config";
import {
  catalogueTextHash,
  type CatalogueText,
  type VenueCatalogueDocument,
} from "@/lib/venue-catalogue";

type LocalizedPair = { es: string; en: string };

type LibreTranslateResponse = {
  translatedText?: string | string[];
  error?: string;
};

function translationEndpoints() {
  const configured = process.env.AKIPASA_TRANSLATION_URL?.trim();
  const publicMirrors = [
    "https://translate.terraprint.co/translate",
    "https://translate.foxhaven.cyou/translate",
    "https://trans.zillyhuhn.com/translate",
    "https://lt.psf.lt/translate",
    "https://translate.argosopentech.com/translate",
  ];
  return configured
    ? [configured, ...publicMirrors.filter((endpoint) => endpoint !== configured)]
    : publicMirrors;
}

async function translateOneAtEndpoint(
  endpoint: string,
  sourceLocale: Locale,
  targetLocale: Locale,
  value: string,
): Promise<string> {
  const body = new URLSearchParams({
    q: value,
    source: sourceLocale,
    target: targetLocale,
    format: "text",
  });
  const apiKey = process.env.AKIPASA_TRANSLATION_API_KEY?.trim();
  if (apiKey) body.set("api_key", apiKey);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  const result = (await response.json().catch(() => ({}))) as LibreTranslateResponse;
  if (!response.ok) {
    throw new Error(
      result.error || `LibreTranslate request failed (${response.status})`,
    );
  }

  const translated = Array.isArray(result.translatedText)
    ? result.translatedText[0]
    : result.translatedText;

  if (typeof translated !== "string" || !translated.trim()) {
    throw new Error("LibreTranslate returned an unexpected response");
  }

  return translated.trim();
}

async function translateValuesAtEndpoint(
  endpoint: string,
  sourceLocale: Locale,
  targetLocale: Locale,
  values: string[],
): Promise<string[]> {
  const translated: string[] = [];
  const concurrency = 4;

  for (let index = 0; index < values.length; index += concurrency) {
    const chunk = values.slice(index, index + concurrency);
    translated.push(
      ...(await Promise.all(
        chunk.map((value) =>
          translateOneAtEndpoint(endpoint, sourceLocale, targetLocale, value),
        ),
      )),
    );
  }

  return translated;
}

async function libreTranslateBatch(
  sourceLocale: Locale,
  targetLocale: Locale,
  values: string[],
): Promise<string[]> {
  if (!values.length) return [];

  let lastError = "No translation endpoint responded";

  for (const endpoint of translationEndpoints()) {
    try {
      return await translateValuesAtEndpoint(
        endpoint,
        sourceLocale,
        targetLocale,
        values,
      );
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "translation_request_failed";
    }
  }

  throw new Error(lastError);
}

export async function translateLocalizedFields(
  sourceLocale: Locale,
  fields: Record<string, string>,
  actorId: string,
): Promise<Record<string, LocalizedPair>> {
  void actorId;
  const entries: Array<[string, string]> = Object.entries(fields).map(
    ([key, value]) => [key, value.trim()],
  );
  const nonEmptyEntries = entries.filter(([, value]) => value.length > 0);
  const emptyKeys = entries
    .filter(([, value]) => value.length === 0)
    .map(([key]) => key);

  if (nonEmptyEntries.length === 0) {
    return Object.fromEntries(
      entries.map(([key]) => [key, { es: "", en: "" }]),
    );
  }

  const targetLocale: Locale = sourceLocale === "es" ? "en" : "es";
  let translatedValues: string[];

  try {
    translatedValues = await libreTranslateBatch(
      sourceLocale,
      targetLocale,
      nonEmptyEntries.map(([, value]) => value),
    );
  } catch (error) {
    console.error("AkiPasa translation unavailable; preserving source copy", {
      sourceLocale,
      targetLocale,
      fieldCount: nonEmptyEntries.length,
      error: error instanceof Error ? error.message : "unknown_error",
    });

    // Translation should improve the experience, never block a business owner
    // from saving. If the open-source service is unavailable, keep the source
    // text in both locales so the listing remains usable and editable.
    translatedValues = nonEmptyEntries.map(([, value]) => value);
  }

  const translated: Record<string, LocalizedPair> = {};
  nonEmptyEntries.forEach(([key, source], index) => {
    const target = translatedValues[index]?.trim() || source;
    translated[key] =
      sourceLocale === "es"
        ? { es: source, en: target }
        : { es: target, en: source };
  });

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
      if (existingFallback && existingFallback === existingSource) {
        // A previous translator outage may have copied the source into both
        // locales. Retry it instead of treating that fallback as translated.
        translateFromSource[key] = value;
      } else {
        keep[key] = {
          es: existing.es || "",
          en: existing.en || "",
        };
      }
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
        if (translatedValue.trim() !== target.source.trim()) {
          target.pair._translation = {
            sourceLocale: target.sourceLocale,
            sourceHash: target.hash,
            esHash: catalogueTextHash(target.pair.es.trim()),
            enHash: catalogueTextHash(target.pair.en.trim()),
          };
        } else {
          // Exact copies can be legitimate names, but they are also our
          // outage fallback. Leaving them unmarked lets the next save retry.
          delete target.pair._translation;
        }
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
