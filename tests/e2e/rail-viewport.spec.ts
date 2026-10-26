import { expect, test } from "@playwright/test";

test("AkiSuite rail keeps its controls reachable on short desktop windows", async ({
  page,
}) => {
  for (const height of [480, 740, 900]) {
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
    await expect(
      popover.getByRole("link", { name: "AkiBusiness" }),
    ).toBeVisible();
    const popoverRect = await popover.boundingBox();
    expect(popoverRect).not.toBeNull();
    expect(popoverRect!.y).toBeGreaterThanOrEqual(0);
    expect(popoverRect!.y + popoverRect!.height).toBeLessThanOrEqual(
      height + 1,
    );
    await rail.locator(".app-suite-trigger").click();

    await rail.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(rail).toHaveClass(/app-rail--compact/);
    await expect(rail.locator(".app-suite-trigger")).toBeVisible();
    const compactDock = await dock.boundingBox();
    expect(compactDock).not.toBeNull();
    expect(compactDock!.y + compactDock!.height).toBeLessThanOrEqual(
      height + 1,
    );
    const account = rail.locator(".app-rail-cta");
    await expect(account).toHaveCSS("height", "52px");
    await expect(account.locator("svg")).toHaveCSS("width", "21px");
    await expect(rail).toHaveCSS("transition-duration", "0s");
    await rail.locator(".app-suite-trigger").click();
    const compactPopover = await popover.boundingBox();
    const railRect = await rail.boundingBox();
    expect(compactPopover!.x).toBeGreaterThan(railRect!.x + railRect!.width);
    expect(compactPopover!.y).toBeGreaterThanOrEqual(0);
    expect(compactPopover!.y + compactPopover!.height).toBeLessThanOrEqual(
      height,
    );
    expect(compactPopover!.x + compactPopover!.width).toBeLessThanOrEqual(1280);
    await rail.locator(".app-suite-trigger").click();
    await rail.getByRole("button", { name: "Expand sidebar" }).click();
    await expect(account).toHaveCSS("height", "52px");
  }
});
