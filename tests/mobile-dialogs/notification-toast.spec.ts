import { expect, test } from "@playwright/test";

for (const width of [320, 375, 767]) {
  for (const theme of ["light", "dark"]) {
    test(`mobile notification is compact and clear of navigation at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 850 });
      await page.goto(`/?kind=notification-toast&theme=${theme}`);
      const region = page.getByRole("region", { name: "New notifications", exact: true });
      const dismiss = region.getByRole("button", { name: "Dismiss notification", exact: true });
      await expect(dismiss).toBeVisible();
      await expect(dismiss.locator("..")).toHaveCSS("opacity", "1");
      await page.evaluate(() => document.fonts.ready);
      const link = region.getByRole("link");
      const bounds = (await link.boundingBox())!;
      expect(bounds.height).toBeLessThanOrEqual(125);
      expect((await dismiss.boundingBox())!.width).toBe(44);
      expect((await dismiss.boundingBox())!.height).toBe(44);
      const body = link.locator(":scope > span").nth(1);
      const service = body.locator(":scope > span").nth(1);
      const detail = body.locator(":scope > span").nth(2);
      await expect(service).toHaveCSS("-webkit-line-clamp", "1");
      await expect(detail).toHaveCSS("-webkit-line-clamp", "2");
      expect(await service.evaluate((e) => e.clientHeight <= parseFloat(getComputedStyle(e).lineHeight) + 1)).toBe(true);
      expect(await detail.evaluate((e) => e.clientHeight <= parseFloat(getComputedStyle(e).lineHeight) * 2 + 1)).toBe(true);
      await expect(region.locator("time")).not.toBeVisible();
      const nav = (await page.getByRole("navigation", { name: "Main", exact: true }).boundingBox())!;
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(nav.y - 8);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `artifacts/mobile-dialogs/notification-toast-${width}-${theme}.png`, fullPage: true });
      await dismiss.click();
      await expect(dismiss).toHaveCount(0);
      expect(await page.evaluate(() => localStorage.getItem("notification-action"))).toBeNull();
      await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
    });
  }
}

test("mobile queues other arrivals and opens their feed without marking them read", async ({ page }) => {
  await page.goto("/?kind=notification-toast&count=3");
  const region = page.getByRole("region", { name: "New notifications", exact: true });
  await expect(region.getByRole("button", { name: "Dismiss notification" })).toHaveCount(1);
  await expect(region.getByText(/\(request 3\)/)).toBeVisible();
  await expect(region.getByRole("link", { name: "3 new notifications", exact: true })).toBeVisible();
  await region.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(region.getByText(/\(request 2\)/)).toBeVisible();
  await region.getByRole("link", { name: "2 new notifications", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("notification-action"))).toBeNull();
});

test("opening the preview reads the notification and opens its request", async ({ page }) => {
  await page.goto("/?kind=notification-toast");
  await page.getByRole("region", { name: "New notifications", exact: true }).getByRole("link").click();
  await expect(page.getByRole("heading", { name: "Request details", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("notification-action"))).toBe(JSON.stringify({ notificationId: "notice-1", action: "read" }));
});

test("long notifications and enlarged text fit a short mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 550 });
  await page.goto("/?kind=notification-toast&count=3&long&large");
  const region = page.getByRole("region", { name: "New notifications", exact: true });
  const dismiss = region.getByRole("button", { name: "Dismiss notification" });
  await expect(dismiss).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const bounds = (await region.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual((await page.getByRole("navigation", { name: "Main", exact: true }).boundingBox())!.y - 8);
});

test("desktop retains its notification stack, timestamps, and sizing", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?kind=notification-toast&count=3");
  const region = page.getByRole("region", { name: "New notifications", exact: true });
  await expect(region.getByRole("button", { name: "Dismiss notification" })).toHaveCount(3);
  await expect(region.getByRole("link", { name: "3 new notifications", exact: true })).toHaveCount(0);
  for (const link of await region.getByRole("link").all()) {
    await expect(link.locator("..")).toHaveCSS("opacity", "1");
    expect((await link.boundingBox())!.width).toBe(384);
  }
  await expect(region.locator("time").last().locator("..")).toHaveCSS("display", "flex");
  await expect(region.getByRole("button", { name: "Dismiss notification" }).first()).toHaveCSS("width", "32px");
});
