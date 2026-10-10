import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const bundle = await build({
  stdin: {
    contents:
      "export {renderClaimDecision} from './src/lib/claim-decision-email';",
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const { renderClaimDecision } = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundle.outputFiles[0].text).toString("base64")
);
const dir = "test-results/claim-emails";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BOOKING_BROWSER_PATH
    ? { executablePath: process.env.BOOKING_BROWSER_PATH }
    : {}),
});
try {
  for (const locale of ["en", "es"])
    for (const decision of ["approved", "rejected"])
      for (const width of [360, 960]) {
        const mail = renderClaimDecision({
          claimId: "10000000-0000-4000-8000-000000000010",
          venueId: "10000000-0000-4000-8000-000000000005",
          venueName: "Example Venue",
          applicantName: "Test Applicant",
          reason:
            decision === "approved"
              ? "Ownership verified."
              : "Please provide an official company email and explain your role at the venue.",
          locale,
          decision,
        });
        const page = await browser.newPage({
          viewport: { width, height: 1000 },
        });
        await page.setContent(mail.html);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const link = page.getByRole("link");
        await expect(link).toBeVisible();
        expect(await link.getAttribute("href")).toContain(
          decision === "approved" ? "/business/venue/" : "view=claims&venueId=",
        );
        expect(
          await link.evaluate((el) => el.getBoundingClientRect().height),
        ).toBeGreaterThanOrEqual(44);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `${dir}/${locale}-${decision}-${width}.png`,
          fullPage: true,
        });
        writeFileSync(`${dir}/${locale}-${decision}.html`, mail.html);
        await page.close();
        console.log(`PASS claim email ${locale} ${decision} ${width}`);
      }
} finally {
  await browser.close();
}
