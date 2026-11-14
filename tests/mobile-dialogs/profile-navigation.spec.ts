import { expect, test } from "@playwright/test";
import { OPEN_PROBLEM_REPORT } from "../../src/features/feedback/problem-report-events";

for (const width of [320, 375, 767]) {
  for (const theme of ["light", "dark"]) {
    test(`Profile and the top bell navigate at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 850 });
      await page.addInitScript((value) => localStorage.setItem("civicheck-theme", value), theme);
      await page.goto("/profile.html");
      const nav = page.getByRole("navigation", { name: "Main", exact: true });
      expect(await nav.getByRole("link").allTextContents()).toEqual(["Home", "Services", "Requests", "Profile"]);
      await expect(nav.getByRole("link", { name: /Notifications|Alerts/ })).toHaveCount(0);
      await expect(page.locator("header").getByRole("switch")).toHaveCount(0);
      await nav.getByRole("link", { name: "Profile", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Appearance", exact: true })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Profile", exact: true })).toHaveAttribute("data-status", "active");
      await expect(page.getByText("ana.cruz@example.com", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: theme === "dark" ? "Dark" : "Light", exact: true })).toHaveAttribute("aria-pressed", "true");
      for (const button of await page.getByRole("main").getByRole("button").all()) {
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `artifacts/mobile-dialogs/profile-${width}-${theme}.png`, fullPage: true });
      await page.getByRole("link", { name: "Notifications, 2 unread" }).click();
      await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await nav.getByRole("link", { name: "Profile", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Appearance", exact: true })).toBeVisible();
      await nav.getByRole("link", { name: "My Requests", exact: true }).click();
      await expect(page.getByRole("heading", { name: "My requests", exact: true })).toBeVisible();
    });
  }
}

test("theme persists, Settings opens both tabs, report and logout stay connected", async ({ page }) => {
  await page.goto("/profile.html?start=/profile");
  const dark = page.getByRole("button", { name: "Dark", exact: true });
  await dark.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem("civicheck-theme"))).toBe("dark");
  const nav = page.getByRole("navigation", { name: "Main", exact: true });
  await nav.getByRole("link", { name: "My Requests", exact: true }).click();
  await nav.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Settings Personal details and password" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("tab", { name: "Profile", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByLabel("First name", { exact: false })).toHaveValue("Ana");
  await dialog.getByRole("tab", { name: "Security", exact: true }).click();
  await expect(dialog.locator("#settings-currentPassword")).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.evaluate((event) => window.addEventListener(event, () => localStorage.setItem("profile-report-opened", "yes")), OPEN_PROBLEM_REPORT);
  await page.getByRole("button", { name: "Report a problem", exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem("profile-report-opened"))).toBe("yes");
  const light = page.getByRole("button", { name: "Light", exact: true });
  await light.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("link", { name: "Log out", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Signing out", exact: true })).toBeVisible();
});

for (const width of [768, 1440]) {
  test(`desktop excludes Profile and keeps theme in Settings at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/profile.html?start=/profile");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    const sidebar = page.getByRole("complementary", { name: "Desktop navigation" });
    await expect(sidebar.getByRole("link", { name: "Profile", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Profile", exact: true })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Main", exact: true })).not.toBeVisible();
    await expect(page.locator("header").getByRole("switch")).toHaveCount(0);
    await sidebar.getByRole("button", { name: "Settings", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("switch", { name: "Dark mode", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("link", { name: "Notifications, 2 unread" }).click();
    await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
  });
}

test("resizing mobile Profile to desktop returns to the dashboard", async ({ page }) => {
  await page.goto("/profile.html?start=/profile");
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toHaveCount(0);
});

for (const loading of [false, true]) {
  test(`long identity and ${loading ? "loading" : "loaded"} Profile fit mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 });
    await page.goto(`/profile.html?start=/profile&long${loading ? "&loading" : ""}`);
    await expect(page.getByText("Appearance", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    if (loading) await expect(page.getByRole("button", { name: "Dark", exact: true })).toBeDisabled();
  });
}
