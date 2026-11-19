import { expect, test, type Locator } from "@playwright/test";

async function checkFooter(dialog: Locator, submitLabel: string, minimumHeight: number) {
  // Opening the dialog briefly scales its contents; measure the settled targets.
  await expect.poll(async () => (await dialog.getByRole("button", { name: "Cancel", exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(minimumHeight);
  const cancel = await dialog.getByRole("button", { name: "Cancel", exact: true }).boundingBox();
  const submit = await dialog.getByRole("button", { name: submitLabel, exact: true }).boundingBox();
  expect(cancel!.height).toBeGreaterThanOrEqual(minimumHeight);
  expect(submit!.height).toBeGreaterThanOrEqual(minimumHeight);
  expect(Math.abs(cancel!.height - submit!.height)).toBeLessThanOrEqual(1);
  expect(cancel!.x + cancel!.width).toBeLessThanOrEqual(submit!.x);
}

for (const theme of ["light", "dark"]) {
  for (const loading of [false, true]) {
    for (const fontSize of [20, 32]) {
      test(`${loading ? "loading" : "loaded"} Profile fits ${fontSize}px text in ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 780 });
        await page.addInitScript((value) => localStorage.setItem("civicheck-theme", value), theme);
        await page.goto(`/profile.html?start=/profile${loading ? "&loading" : ""}`);
        await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}px`; }, fontSize);
        const card = page.getByRole("main").locator('[data-slot="card"]');
        const bounds = (await card.boundingBox())!;
        for (const control of await card.locator('button, a, [data-slot="card-title"], [data-slot="card-description"]').all()) {
          const box = (await control.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(bounds.x);
          expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
          expect(await control.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        }
        for (const label of ["Light", "Dark"]) {
          const choice = card.getByRole("button", { name: label, exact: true });
          await expect(choice).toBeVisible();
          if (loading) await expect(choice).toBeDisabled();
          else {
            await choice.tap();
            await expect(choice).toHaveAttribute("aria-pressed", "true");
          }
        }
        if (!loading) await card.getByRole("button", { name: theme === "light" ? "Light" : "Dark", exact: true }).tap();
        if (!loading) {
          const name = await card.locator('[data-slot="card-title"]').boundingBox();
          expect(name!.width).toBeGreaterThanOrEqual(bounds.width / 2);
          expect(name!.height).toBeLessThan(fontSize * 4);
        }
        const logout = card.getByRole(loading ? "button" : "link", { name: "Log out", exact: true });
        await logout.scrollIntoViewIfNeeded();
        const logoutBounds = (await logout.boundingBox())!;
        const navBounds = (await page.getByRole("navigation", { name: "Main", exact: true }).boundingBox())!;
        expect(logoutBounds.y + logoutBounds.height).toBeLessThanOrEqual(navBounds.y);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
        await page.screenshot({ path: `artifacts/mobile-dialogs/profile-${loading ? "loading" : "loaded"}-${fontSize}-${theme}.png`, fullPage: true });
      });
    }
  }
  for (const fontSize of [20, 24, 32]) {
    test(`bottom navigation keeps touch targets with ${fontSize}px text in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 780 });
      await page.addInitScript((value) => localStorage.setItem("civicheck-theme", value), theme);
      await page.goto("/profile.html?start=/profile");
      await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}px`; }, fontSize);
      const nav = page.getByRole("navigation", { name: "Main", exact: true });
      for (const name of ["Dashboard", "Browse Services", "My Requests", "Profile"]) {
        const link = nav.getByRole("link", { name, exact: true });
        await link.tap();
        await expect(link).toHaveAttribute("data-status", "active");
        const bounds = (await nav.boundingBox())!;
        const links = await nav.getByRole("link").all();
        let right = bounds.x;
        for (const item of links) {
          const box = (await item.boundingBox())!;
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.x).toBeGreaterThanOrEqual(right - 1);
          expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
          right = box.x + box.width;
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
      await page.screenshot({ path: `artifacts/mobile-dialogs/mobile-nav-${fontSize}-${theme}.png`, fullPage: true });
    });
  }

  for (const viewport of [{ width: 320, height: 568 }, { width: 393, height: 780 }, { width: 640, height: 360 }]) {
    test(`Settings controls and actions fit ${viewport.width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript((value) => localStorage.setItem("civicheck-theme", value), theme);
      await page.goto("/profile.html?start=/profile");
      await page.getByRole("button", { name: "Settings Personal details and password" }).tap();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      expect((await dialog.locator("#profile-suffix").boundingBox())!.height).toBeGreaterThanOrEqual(48);
      await checkFooter(dialog, "Save changes", 48);
      await dialog.getByRole("tab", { name: "Security", exact: true }).tap();
      for (const id of ["settings-currentPassword", "settings-newPassword", "settings-confirmPassword"]) {
        const input = dialog.locator(`#${id}`);
        const group = input.locator("..");
        expect((await group.boundingBox())!.height).toBeGreaterThanOrEqual(48);
        expect(parseFloat(await input.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
        const reveal = group.getByRole("button");
        const box = (await reveal.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      await dialog.locator("#settings-currentPassword").fill("example-password");
      await dialog.getByRole("button", { name: "Show current password", exact: true }).tap();
      await expect(dialog.locator("#settings-currentPassword")).toHaveAttribute("type", "text");
      await dialog.getByRole("button", { name: "Hide current password", exact: true }).tap();
      await expect(dialog.locator("#settings-currentPassword")).toHaveAttribute("type", "password");
      await checkFooter(dialog, "Update password", 48);
      await dialog.locator("#settings-confirmPassword").scrollIntoViewIfNeeded();
      const field = (await dialog.locator("#settings-confirmPassword").boundingBox())!;
      const footer = (await dialog.getByRole("button", { name: "Cancel", exact: true }).boundingBox())!;
      expect(field.y + field.height).toBeLessThanOrEqual(footer.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({ path: `artifacts/mobile-dialogs/settings-${viewport.width}-${theme}.png`, fullPage: true });
    });
  }
}

test.describe("desktop settings", () => {
  test.use({ isMobile: false, hasTouch: false });
  for (const theme of ["light", "dark"]) {
    test(`controls retain their desktop size in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.addInitScript((value) => localStorage.setItem("civicheck-theme", value), theme);
      await page.goto("/profile.html");
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.locator("#profile-suffix")).toHaveCSS("height", "44px");
      await checkFooter(dialog, "Save changes", 44);
      await dialog.getByRole("tab", { name: "Security", exact: true }).click();
      await expect(dialog.locator("#settings-currentPassword").locator("..")).toHaveCSS("height", "44px");
      await checkFooter(dialog, "Update password", 44);
      await page.screenshot({ path: `artifacts/mobile-dialogs/settings-desktop-${theme}.png`, fullPage: true });
    });
  }
});
