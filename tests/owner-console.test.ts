import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import postcss from "postcss";
import {
  ownerAccents,
  ownerBackgrounds,
  ownerBackgroundPathSchema,
  ownerPreferencesSchema,
} from "../src/lib/owner-console";

const read = (path: string) => readFileSync(path, "utf8");

describe("owner console", () => {
  it("accepts only supported appearance preferences", () => {
    expect(
      ownerPreferencesSchema.safeParse({
        locale: "en",
        background: "aurora",
        accent: "teal",
        motion: "on",
        glass: "on",
      }).success,
    ).toBe(true);
    expect(
      ownerPreferencesSchema.safeParse({
        locale: "en",
        background: "javascript:alert(1)",
        accent: "teal",
      }).success,
    ).toBe(false);
  });

  it("accepts only UUID-scoped owner image paths", () => {
    expect(
      ownerBackgroundPathSchema.safeParse({
        locale: "en",
        path: "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.webp",
      }).success,
    ).toBe(true);
    expect(
      ownerBackgroundPathSchema.safeParse({
        locale: "en",
        path: "someone-else/background.svg",
      }).success,
    ).toBe(false);
  });

  it("keeps owner backgrounds private and UUID-folder isolated", () => {
    const migration = read(
      "database/migrations/0067_private_owner_backgrounds.sql",
    );
    expect(migration).toContain(
      "'owner-backgrounds','owner-backgrounds',false",
    );
    expect(migration).toContain("10485760");
    expect(migration).toContain("array['image/jpeg','image/png','image/webp']");
    expect(migration).toContain(
      "(storage.foldername(name))[1]=(select auth.uid())::text",
    );
    expect(migration).toContain("and public.has_owner_console()");
    expect(migration).not.toMatch(/alexashing|@[a-z0-9.-]+\.[a-z]{2,}/i);
  });
  it("uses an explicit UUID entitlement with self-only RLS", () => {
    const migration = read("database/migrations/0066_owner_console.sql");
    expect(migration).toContain(
      "profile_id uuid primary key references profiles(id)",
    );
    expect(migration).toContain("profile_id=(select auth.uid())");
    expect(migration).toContain("create function has_owner_console()");
    expect(migration).toContain(
      "revoke all on function has_owner_console() from public,anon",
    );
    expect(migration).not.toMatch(/alexashing|@[a-z0-9.-]+\.[a-z]{2,}/i);
  });

  it("guards the private route and conditionally mounts global owner UI", () => {
    const ownerPage = read("src/app/[locale]/owner/page.tsx");
    const layout = read("src/app/[locale]/layout.tsx");
    const shell = read("src/components/AppShell.tsx");
    expect(ownerPage).toContain("requireOwnerConsole(locale)");
    expect(layout).toContain('supabase.rpc("has_owner_console")');
    expect(layout).toContain("{ownerConsole && (");
    expect(shell).toContain("...(ownerConsole");
  });
});

// Guard readability for every owner palette, including secondary field text.
// Values come from the shipped styles rather than a duplicate palette fixture.
const appearance = postcss.parse(read("src/app/appearance.css"));
const globalStyles = postcss.parse(read("src/app/globals.css"));

function tokens(selector: string) {
  const values: Record<string, string> = {};
  appearance.walkRules(selector, (rule) => {
    rule.walkDecls((declaration) => {
      values[declaration.prop] = declaration.value;
    });
  });
  return values;
}

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a: string, b: string) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe("appearance readability", () => {
  for (const background of ownerBackgrounds) {
    for (const mode of ["light", "dark"]) {
      it(`${background} has readable ${mode} surfaces and all five accents`, () => {
        const palette = {
          ...tokens(`html[data-owner-background="${background}"]`),
          ...(mode === "light"
            ? tokens(
                `html[data-theme="light"][data-owner-background="${background}"]`,
              )
            : {}),
        };
        expect(palette["--owner-canvas"]).toBeTruthy();
        for (const surface of ["--surface", "--surface-alt", "--sand"]) {
          for (const text of ["--ink", "--muted"]) {
            expect(
              contrast(palette[text], palette[surface]),
              `${text} on ${surface}`,
            ).toBeGreaterThanOrEqual(4.5);
          }
          for (const accent of ownerAccents) {
            const accentPalette = {
              ...tokens(`html[data-owner-accent="${accent}"]`),
              ...(mode === "light"
                ? tokens(
                    `html[data-theme="light"][data-owner-accent="${accent}"]`,
                  )
                : {}),
            };
            expect(
              contrast(accentPalette["--primary-text"], palette[surface]),
              `${accent} on ${surface}`,
            ).toBeGreaterThanOrEqual(4.5);
          }
        }
      });
    }
  }

  it("does not reset inherited owner colours on body or force a theme into light mode", () => {
    globalStyles.walkRules((rule) => {
      if (
        rule.selector
          .split(",")
          .some(
            (selector) =>
              selector.trim() === '[data-theme="dark"]' ||
              selector.trim() === '[data-theme="light"]',
          )
      ) {
        throw new Error(
          "Brightness tokens must be scoped to html so body inherits owner themes",
        );
      }
      if (rule.selector.includes("data-owner-background")) {
        rule.walkDecls("color-scheme", () => {
          throw new Error(
            "Owner backgrounds must respect the selected brightness",
          );
        });
      }
    });
  });

  it("keeps Passport interface colours inherited while the photographic object stays legible", () => {
    const passport = postcss.parse(
      read("src/components/PassportBook.module.css"),
    );
    passport.walkDecls(
      /^--(ink|muted|surface|surface-alt|passport-ink|passport-surface)$/,
      () => {
        throw new Error(
          "Passport must inherit appearance instead of defining a dark-only subtree",
        );
      },
    );
    expect(tokens(":root")["--passport-page"]).not.toEqual(
      tokens('html[data-theme="light"]')["--passport-page"],
    );
    expect(read("src/app/layout.tsx")).toContain('import "./appearance.css"');
  });
});
