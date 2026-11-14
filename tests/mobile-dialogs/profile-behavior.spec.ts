import { expect, test, type Locator, type Page } from "@playwright/test";

async function openSettings(page: Page) {
  await page.goto("/profile.html?start=/profile");
  await page.getByRole("button", { name: "Settings Personal details and password" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function enterPassword(dialog: Locator) {
  await dialog.getByRole("tab", { name: "Security", exact: true }).click();
  await dialog.locator("#settings-currentPassword").fill("OldTestPassword1!");
  await dialog.locator("#settings-newPassword").fill("NewTestPassword2!");
  await dialog.locator("#settings-confirmPassword").fill("NewTestPassword2!");
}

for (const theme of ["light", "dark"]) {
  test.describe(`${theme} settings`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem("civicheck-theme", value), theme);
    });

    test("saving a password preserves unsaved personal details", async ({ page }) => {
      const dialog = await openSettings(page);
      await dialog.locator("#profile-first-name").fill("Ann");
      await enterPassword(dialog);
      await dialog.getByRole("button", { name: "Update password", exact: true }).click();
      await expect(dialog).toHaveAttribute("data-open", "");
      await expect(dialog.getByRole("tab", { name: "Profile", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(dialog.locator("#profile-first-name")).toHaveValue("Ann");
      await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      expect(await page.evaluate(() => window.__settingsSaveCalls)).toBe(2);
    });

    test("saving personal details preserves unsaved password fields", async ({ page }) => {
      const dialog = await openSettings(page);
      await enterPassword(dialog);
      await dialog.getByRole("tab", { name: "Profile", exact: true }).click();
      await dialog.locator("#profile-first-name").fill("Ann");
      await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect(dialog.getByRole("tab", { name: "Security", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(dialog.locator("#settings-newPassword")).toHaveValue("NewTestPassword2!");
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      const discard = page.getByRole("alertdialog");
      await expect(discard).toBeVisible();
      await discard.getByRole("button", { name: "Keep editing", exact: true }).click();
      await expect(dialog.locator("#settings-newPassword")).toHaveValue("NewTestPassword2!");
      await dialog.getByRole("button", { name: "Update password", exact: true }).click();
      await expect(dialog).toHaveCount(0);
    });

    for (const section of ["profile", "security"]) {
      for (const mode of ["reject", "error"] as const) {
        test(`${section} save ${mode} is visible and retry keeps the values`, async ({ page }) => {
          const dialog = await openSettings(page);
          if (section === "profile") await dialog.locator("#profile-first-name").fill("Ann");
          else await enterPassword(dialog);
          await page.evaluate((value) => { window.__settingsMutationMode = value; }, mode);
          const submit = dialog.getByRole("button", { name: section === "profile" ? "Save changes" : "Update password", exact: true });
          await submit.click();
          await expect(dialog.getByRole("alert")).toBeVisible();
          await expect(dialog.locator(section === "profile" ? "#profile-first-name" : "#settings-newPassword")).toHaveValue(section === "profile" ? "Ann" : "NewTestPassword2!");
          await expect(submit).toBeEnabled();
          await page.evaluate(() => { window.__settingsMutationMode = "success"; });
          await submit.click();
          await expect(dialog).toHaveCount(0);
          expect(await page.evaluate(() => window.__settingsSaveCalls)).toBe(2);
        });
      }

      test(`${section} cannot be edited or dismissed while saving`, async ({ page }) => {
        const dialog = await openSettings(page);
        if (section === "profile") await dialog.locator("#profile-first-name").fill("Ann");
        else await enterPassword(dialog);
        await page.evaluate(() => { window.__settingsMutationMode = "pending"; });
        await dialog.getByRole("button", { name: section === "profile" ? "Save changes" : "Update password", exact: true }).click();
        await expect.poll(() => page.evaluate(() => window.__settingsSaveCalls)).toBe(1);
        await expect(dialog.locator(section === "profile" ? "#profile-first-name" : "#settings-newPassword")).toBeDisabled();
        await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
        await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeDisabled();
        for (const tab of await dialog.getByRole("tab").all()) await expect(tab).toBeDisabled();
        await page.keyboard.press("Escape");
        await expect(dialog).toBeVisible();
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        await page.evaluate(() => window.__finishSettingsSave?.());
        await expect(dialog).toHaveCount(0);
        expect(await page.evaluate(() => window.__settingsSaveCalls)).toBe(1);
      });
    }

    test("invalid details stay open, discard works, and reopening is clean", async ({ page }) => {
      const dialog = await openSettings(page);
      await dialog.locator("#profile-first-name").fill("");
      await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect(dialog.getByRole("alert").filter({ hasText: "First name is required" })).toBeVisible();
      expect(await page.evaluate(() => window.__settingsSaveCalls ?? 0)).toBe(0);
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Discard and close", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await page.getByRole("button", { name: "Settings Personal details and password" }).click();
      await expect(dialog.locator("#profile-first-name")).toHaveValue("Ana");
      await expect(dialog.getByRole("button", { name: "Save changes", exact: true })).toBeDisabled();
    });
  });
}
