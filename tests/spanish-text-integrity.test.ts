import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const repair = readFileSync(
  join(process.cwd(), "database/repairs/2026-10-12-spanish-ui-copy.sql"),
  "utf8",
);

describe("Spanish UI text integrity", () => {
  it("repairs only the verified labels, preserving IDs, English copy and feature state", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        create table categories(id integer primary key, slug text unique, name_es text, name_en text);
        create table feature_flags(key text primary key, enabled boolean, label_es text, label_en text);
      `);
      await db.query(
        "insert into categories values (1, 'literature', $1, 'Literature and poetry'), (2, 'tradition', $2, 'Tradition'), (3, 'music', $3, 'Music')",
        [
          "Literatura y poes\u00c3\u00ada",
          "Tradici\u00c3\u00b3n",
          "Música, año, acción, cafè, plaça",
        ],
      );
      await db.query(
        "insert into feature_flags values ('recommendation_reasons', false, $1, 'Recommendation reasons'), ('other', true, $2, 'Other')",
        ["Motivos de recomendaci\u00c3\u00b3n", "Comunicación"],
      );
      await db.exec(repair);
      expect(
        (await db.query("select * from categories order by id")).rows,
      ).toEqual([
        {
          id: 1,
          slug: "literature",
          name_es: "Literatura y poesía",
          name_en: "Literature and poetry",
        },
        {
          id: 2,
          slug: "tradition",
          name_es: "Tradición",
          name_en: "Tradition",
        },
        {
          id: 3,
          slug: "music",
          name_es: "Música, año, acción, cafè, plaça",
          name_en: "Music",
        },
      ]);
      expect(
        (await db.query("select * from feature_flags order by key")).rows,
      ).toEqual([
        {
          key: "other",
          enabled: true,
          label_es: "Comunicación",
          label_en: "Other",
        },
        {
          key: "recommendation_reasons",
          enabled: false,
          label_es: "Motivos de recomendación",
          label_en: "Recommendation reasons",
        },
      ]);
      const repeated = await db.query<{
        repaired_labels: { categories: unknown[]; feature_flags: unknown[] };
      }>(repair);
      expect(repeated.rows[0].repaired_labels).toEqual({
        categories: [],
        feature_flags: [],
      });
      await db.query(
        "update categories set name_es = $1 where slug = 'literature'",
        ["Poesía y literatura local"],
      );
      await db.exec(repair);
      expect(
        (
          await db.query(
            "select name_es from categories where slug = 'literature'",
          )
        ).rows[0],
      ).toEqual({ name_es: "Poesía y literatura local" });
    } finally {
      await db.close();
    }
  });

  it("keeps shipped interface source in valid UTF-8 without mojibake pairs", () => {
    const sourceRoot = join(process.cwd(), "src");
    const corruptPair =
      /\u00c3[\u0080-\u00bf\u0192]|\u00c2[\u0080-\u00bf]|\u00e2\u20ac|\u00f0\u0178|\ufffd/;
    const problems: string[] = [];
    function inspect(directory: string) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) inspect(path);
        else if (/\.(?:tsx?|jsx?|json|css)$/.test(entry.name)) {
          try {
            const text = new TextDecoder("utf-8", { fatal: true }).decode(
              readFileSync(path),
            );
            if (corruptPair.test(text))
              problems.push(relative(sourceRoot, path));
          } catch {
            problems.push(relative(sourceRoot, path));
          }
        }
      }
    }
    inspect(sourceRoot);
    expect(problems).toEqual([]);
  });
});
