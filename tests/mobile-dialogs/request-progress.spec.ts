import { expect, test } from "@playwright/test";

const stages = ["Submission", "Validation", "Processing", "Release"];

for (const width of [320, 375, 767]) {
  for (const theme of ["light", "dark"]) {
    test(`compact request text and clear tracker at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 850 });
      await page.goto(`/?kind=request-progress&theme=${theme}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-size", "22px");
      const progress = page.getByRole("list", { name: "Request progress", exact: true });
      const items = progress.locator(":scope > li");
      const nodes = items.locator(":scope > div > span:first-child");
      await expect(items).toHaveCount(4);
      await expect(nodes.first()).toHaveCSS("width", "32px");
      for (let index = 0; index < stages.length; index++) {
        const label = items.nth(index).locator(":scope > p");
        await expect(label).toHaveText(stages[index]);
        expect(parseFloat(await label.evaluate((e) => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(11);
        expect(await label.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
        expect(await label.evaluate((e) => e.clientHeight <= parseFloat(getComputedStyle(e).lineHeight) + 1)).toBe(true);
        const node = (await nodes.nth(index).boundingBox())!;
        const labelBounds = (await label.boundingBox())!;
        expect(Math.abs((node.x + node.width / 2) - (labelBounds.x + labelBounds.width / 2))).toBeLessThan(1);
        if (index < 3) {
          const connector = items.nth(index).locator(":scope > div > span:nth-child(2)");
          const line = (await connector.boundingBox())!;
          const nextNode = (await nodes.nth(index + 1).boundingBox())!;
          expect(line.height).toBeGreaterThanOrEqual(3);
          expect(nextNode.x - (node.x + node.width)).toBeGreaterThanOrEqual(20);
          expect(Math.abs(line.x - (node.x + node.width / 2))).toBeLessThan(1);
          expect(Math.abs(line.x + line.width - (nextNode.x + nextNode.width / 2))).toBeLessThan(1);
          await expect(connector).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        }
      }
      const instructions = page.getByRole("region", { name: "Progress", exact: true }).locator(":scope > div > p");
      await expect(instructions).toHaveCSS("font-size", "14px");
      await expect(instructions).toHaveCSS("line-height", "22px");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `artifacts/mobile-dialogs/request-progress-${width}-${theme}.png`, fullPage: true });
    });
  }
}

for (const [status, current] of [["under_validation", "Validation"], ["incomplete", "Validation"], ["processing", "Processing"], ["ready_for_release", "Release"], ["released", null], ["rejected", "Validation"]] as const) {
  test(`tracker preserves the ${status} stage`, async ({ page }) => {
    await page.goto(`/?kind=request-progress&status=${status}`);
    const progress = page.getByRole("list", { name: "Request progress", exact: true });
    if (current) await expect(progress.locator('[aria-current="step"]')).toContainText(current);
    else await expect(progress.locator('[aria-current="step"]')).toHaveCount(0);
    for (const label of stages) await expect(progress.getByText(label, { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
  });
}

test("long service names and enlarged text fit the mobile request view", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/?kind=request-progress&long&large&status=processing");
  for (const label of stages) await expect(page.getByRole("list", { name: "Request progress" }).getByText(label, { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("mobile request loading view retains the four readable labels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/?kind=request-progress&loading");
  for (const label of stages) await expect(page.getByText(label, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

for (const width of [768, 1440]) {
  test(`desktop request typography is preserved at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/?kind=request-progress");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-size", "38px");
    const instructions = page.getByRole("region", { name: "Progress", exact: true }).locator(":scope > div > p");
    await expect(instructions).toHaveCSS("font-size", "15px");
    await expect(instructions).toHaveCSS("line-height", "28px");
    const tracker = page.getByRole("list", { name: "Request progress", exact: true });
    await expect(tracker.locator(":scope > li > p").first()).toHaveCSS("font-size", "18px");
    await expect(tracker.locator(":scope > li > div > span").first()).toHaveCSS("width", "40px");
  });
}
