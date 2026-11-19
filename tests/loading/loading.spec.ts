import { expect, test } from "@playwright/test";

for (const screen of [
  { link: "Notifications", title: "Notifications", release: "notifications", result: "Fetched notification" },
  { link: "My requests", title: "My requests", release: "requests", result: "Fetched request" },
  { link: "Services registry", title: "Services", release: "services", result: "Fetched services" },
]) {
  test(`${screen.title} keeps its header visible while its data is pending`, async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Preview navigation" });
    await nav.getByRole("link", { name: screen.link, exact: true }).click();
    const heading = page.getByRole("heading", { name: screen.title, level: 1, exact: true });
    await expect(heading).toBeVisible();
    await expect(page.locator('[data-slot="skeleton"]').first()).toBeVisible();
    expect(await heading.evaluate(node => node.closest('[data-slot="skeleton"], [aria-hidden="true"]') === null)).toBe(true);
    await expect(nav).toBeVisible();
    await expect(nav.locator('[data-slot="skeleton"]')).toHaveCount(0);
    await expect(page.getByText(screen.result, { exact: true })).toHaveCount(0);
    const before = await heading.boundingBox();
    await page.evaluate(path => window.dispatchEvent(new CustomEvent("release-loading", { detail: path })), screen.release);
    await expect(page.getByText(screen.result, { exact: true })).toBeVisible();
    await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
    const after = await heading.boundingBox();
    expect(after?.x).toBe(before?.x);
    expect(after?.y).toBe(before?.y);
  });
}

test("fixed headings stay visible across mobile, desktop, light, and dark loading views", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  for (const [view, title] of [
    ["notifications", "Notifications"], ["requests", "My requests"], ["catalog", "Browse services"],
    ["staffNotifications", "Notifications"], ["staffCatalog", "Service Reference"], ["staffDashboard", "Staff Dashboard"],
    ["overview", "Overview"], ["reports", "Reports"], ["cashier", "Cashier Counter"],
    ["health", "System Health"], ["security", "Security Center"], ["login", "Welcome back"],
  ]) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/?showcase=${view}`);
      for (const theme of ["light", "dark"]) {
        await page.evaluate(value => document.documentElement.classList.toggle("dark", value === "dark"), theme);
        const heading = page.getByRole("heading", { name: title, level: 1, exact: true });
        await expect(heading).toBeVisible();
        expect(await heading.evaluate(node => node.closest('[data-slot="skeleton"], [aria-hidden="true"]') === null)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view}, ${width}px, ${theme}`).toBe(true);
      }
    }
  }
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/?showcase=detail");
    await expect(page.getByRole("heading", { name: "Submitted details", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Acknowledgment slip", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Request details, ${width}px`).toBe(true);
  }
  expect(errors).toEqual([]);
});
