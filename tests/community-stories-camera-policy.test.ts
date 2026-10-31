import { expect, it } from "vitest";
import config from "../next.config";

it("keeps global camera/microphone/payment denial and scopes the sole camera allowance to exactly EN/ES check-in", async () => {
  const rules = await config.headers!();
  const policies = rules.flatMap((rule) =>
    rule.headers
      .filter((header) => header.key.toLowerCase() === "permissions-policy")
      .map((header) => ({ source: rule.source, value: header.value })),
  );
  expect(policies).toEqual([
    {
      source: "/(.*)",
      value: "camera=(), microphone=(), geolocation=(self), payment=()",
    },
    {
      source: "/:locale(en|es)/check-in",
      value: "camera=(self), microphone=(), geolocation=(self), payment=()",
    },
  ]);
  const allowed = new RegExp("^/" + "(en|es)" + "/check-in$");
  for (const path of ["/en/check-in", "/es/check-in"])
    expect(allowed.test(path)).toBe(true);
  for (const path of [
    "/en",
    "/es",
    "/en/account",
    "/en/community",
    "/api/community/stories",
    "/en/check-in/extra",
    "/fr/check-in",
    "/check-in",
  ])
    expect(allowed.test(path)).toBe(false);
  expect(rules.find((rule) => rule.source === "/(.*)")?.headers).toEqual(
    expect.arrayContaining([
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ]),
  );
});
