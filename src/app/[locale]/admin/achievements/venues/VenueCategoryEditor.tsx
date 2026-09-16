"use client";
import React, { useActionState } from "react";
import type { Locale } from "@/lib/config";
import {
  achievementScopes,
  type AchievementActionState,
} from "@/lib/achievements";
import { saveVenueCategories } from "./actions";
import styles from "../achievements.module.css";
export function VenueCategoryEditor({
  locale,
  id,
  categories,
}: {
  locale: Locale;
  id: string;
  categories: string[];
}) {
  const [state, action, pending] = useActionState<
    AchievementActionState,
    FormData
  >(saveVenueCategories, {});
  const es = locale === "es";
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="venue_id" value={id} />
      <input
        type="hidden"
        name="expected"
        value={[...categories].sort().join(",")}
      />
      <fieldset disabled={pending} className={styles.categoryChecks}>
        <legend>
          {es ? "Categorías confirmadas" : "Confirmed categories"}
        </legend>
        {achievementScopes.categories.map((category) => (
          <label key={category.key}>
            <input
              type="checkbox"
              name="categories"
              value={category.key}
              defaultChecked={categories.includes(category.key)}
            />
            {category[locale]}
          </label>
        ))}
      </fieldset>
      {state.error && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status">
          {es ? "Categorías guardadas." : "Categories saved."}
        </p>
      )}
      <button disabled={pending} className={styles.primary}>
        {pending
          ? es
            ? "Guardando…"
            : "Saving…"
          : es
            ? "Guardar categorías"
            : "Save categories"}
      </button>
    </form>
  );
}
