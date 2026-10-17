import { expect, test } from "@playwright/test";

test("AkiSuite rail keeps its controls reachable on short desktop windows", async ({
  page,
}) => {
  for (const height of [740, 900]) {
    await page.setViewportSize({ width: 1280, height });
    await page.goto("/en");

    const rail = page.locator(".app-rail");
    const dock = rail.locator(".app-rail-bottom");
    await expect(rail).toBeVisible();
    await expect(dock).toBeVisible();
    await expect(rail.locator(".app-suite-trigger")).toBeVisible();
    await expect(
      rail.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeVisible();

    const dockRect = await dock.boundingBox();
    expect(dockRect).not.toBeNull();
    expect(dockRect!.y + dockRect!.height).toBeLessThanOrEqual(height + 1);

    await rail.locator(".app-suite-trigger").click();
    const popover = rail.locator(".app-suite-popover");
    await expect(popover.getByRole("link", { name: "AkiBusiness" })).toBeVisible();
    const popoverRect = await popover.boundingBox();
    expect(popoverRect).not.toBeNull();
    expect(popoverRect!.y).toBeGreaterThanOrEqual(0);
    expect(popoverRect!.y + popoverRect!.height).toBeLessThanOrEqual(height + 1);
    await rail.locator(".app-suite-trigger").click();

    await rail.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(rail).toHaveClass(/app-rail--compact/);
    await expect(rail.locator(".app-suite-trigger")).toBeVisible();
    const compactDock = await dock.boundingBox();
    expect(compactDock).not.toBeNull();
    expect(compactDock!.y + compactDock!.height).toBeLessThanOrEqual(
      height + 1,
    );
    await rail.getByRole("button", { name: "Expand sidebar" }).click();
  }
});
