import { describe, expect, it } from "vitest";
import { workspaceReturnPath } from "../src/lib/workspace-return-path";

describe.each(["en", "es"] as const)("workspaceReturnPath %s", (locale) => {
  it.each(["staff", "admin"] as const)(
    "preserves %s tasks and query",
    (area) => {
      const base = `/${locale}/${area}`;
      for (const suffix of ["", "/", "/audit", "/claims/claim-id"]) {
        expect(workspaceReturnPath(locale, area, base + suffix)).toBe(
          base + suffix,
        );
      }
      const query = "?queue=claims%26show%3Dprivate&period=30&tag=a&tag=b";
      expect(
        workspaceReturnPath(locale, area, `${base}/audit${query}#section`),
      ).toBe(`${base}/audit${query}`);
      expect(workspaceReturnPath(locale, area, `${base}#section`)).toBe(base);
      expect(workspaceReturnPath(locale, area, `${base}?q=%2F%5C%00%23`)).toBe(
        `${base}?q=%2F%5C%00%23`,
      );
    },
  );

  it.each(["staff", "admin"] as const)("rejects unsafe %s paths", (area) => {
    const base = `/${locale}/${area}`;
    const otherLocale = locale === "en" ? "es" : "en";
    const otherArea = area === "staff" ? "admin" : "staff";
    const invalid = [
      null,
      "",
      "audit",
      "https://evil.invalid/en/staff",
      "//evil.invalid/en/staff",
      "///evil.invalid/en/staff",
      ` /${locale}/${area}`,
      `/${otherLocale}/${area}`,
      `/${locale}/${otherArea}`,
      `${base}ing`,
      `${base}-tools`,
      `${base}/../account`,
      `${base}/./audit`,
      `${base}/a/../../${area}`,
      `${base}/%2e%2e/audit`,
      `${base}/%252e%252e/audit`,
      `${base}/%2Faudit`,
      `${base}/%5caudit`,
      `${base}/%`,
      `${base}/caf%C3%A9`,
      `${base}\\audit`,
      `${base}?q=\\evil`,
      `${base}\n/audit`,
      `${base}?q=\rvalue`,
      `${base}\u0000/audit`,
      `${base}\u001f`,
      `${base}\u007f`,
      `${base}#\n`,
      `${base}/${"a".repeat(2048)}`,
    ];
    for (const candidate of invalid)
      expect(
        workspaceReturnPath(locale, area, candidate),
        String(candidate),
      ).toBeNull();
  });

  it("enforces the complete input length bound including query and hash", () => {
    const base = `/${locale}/staff`;
    const exact = `${base}?q=${"a".repeat(2048 - base.length - 3)}`;
    expect(workspaceReturnPath(locale, "staff", exact)).toBe(exact);
    expect(workspaceReturnPath(locale, "staff", `${exact}a`)).toBeNull();
    expect(workspaceReturnPath(locale, "staff", `${exact}#`)).toBeNull();
  });
});
