import { expect, test } from "@playwright/test";
import { WELCOME_TUTORIAL_OPEN_EVENT } from "../../src/features/onboarding/welcome-tutorial.events";

const services = ["Birth Certificate", "Marriage Certificate", "Death Certificate", "Marriage License"];

for (const width of [320, 375, 767]) {
  for (const theme of ["light", "dark"]) {
    test(`current request leads the mobile dashboard at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?kind=dashboard&theme=${theme}`);
      const headline = page.getByRole("heading", { name: "Your request has been submitted", exact: true });
      await expect(headline).toBeVisible();
      const hero = await headline.locator("..").boundingBox();
      const view = page.getByRole("link", { name: "View request", exact: true });
      const viewBounds = await view.boundingBox();
      expect(viewBounds!.height).toBeGreaterThanOrEqual(44);
      expect(viewBounds!.height).toBeLessThanOrEqual(48);
      expect(viewBounds!.width).toBeLessThan(hero!.width * 0.65);

      const tiles = [];
      for (const name of services) {
        const link = page.getByRole("link", { name, exact: true });
        await expect(link).toBeVisible();
        const bounds = await link.boundingBox();
        tiles.push(bounds!);
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
        expect(bounds!.height).toBeLessThanOrEqual(80);
        expect(bounds!.y).toBeGreaterThanOrEqual(hero!.y + hero!.height);
        expect((await link.locator("img").boundingBox())!.width).toBeLessThanOrEqual(40);
        expect(await link.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      }
      expect(tiles[0].y).toBe(tiles[1].y);
      expect(tiles[2].y).toBe(tiles[3].y);
      expect(tiles[2].y).toBeGreaterThan(tiles[0].y);
      expect(tiles[0].x).toBeLessThan(tiles[1].x);
      for (const label of await page.getByRole("list", { name: "Request progress" }).locator("li > p").all()) {
        expect(await label.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

      const tutorial = page.getByRole("button", { name: "How it works", exact: true });
      const tutorialBounds = await tutorial.boundingBox();
      expect(tutorialBounds!.height).toBeGreaterThanOrEqual(44);
      expect(tutorialBounds!.height).toBeLessThanOrEqual(48);
      expect(tutorialBounds!.width).toBeLessThanOrEqual(112);
      await page.evaluate((event) => {
        window.addEventListener(event, () => localStorage.setItem("fixture-tutorial-opened", "yes"));
      }, WELCOME_TUTORIAL_OPEN_EVENT);
      await tutorial.click();
      expect(await page.evaluate(() => localStorage.getItem("fixture-tutorial-opened"))).toBe("yes");
      await page.screenshot({ path: `artifacts/mobile-dialogs/dashboard-${width}-${theme}.png`, fullPage: true });
      await view.click();
      await expect(page.getByRole("heading", { name: "Request details", exact: true })).toBeVisible();

      await page.goto(`/?kind=dashboard&theme=${theme}`);
      await page.getByRole("link", { name: "Birth Certificate", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Services", exact: true })).toBeVisible();
    });
  }
}

test("first-time applicants keep the illustrated service chooser", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/?kind=dashboard&empty=1");
  await expect(page.getByRole("heading", { name: "What do you need today?", exact: true })).toBeVisible();
  const birth = page.getByRole("link", { name: "Birth Certificate", exact: true });
  expect((await birth.boundingBox())!.height).toBe(190);
});

test("the mobile loading view keeps service shortcuts compact", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/?kind=dashboard&loading=1");
  await expect(page.getByText("Start a new request", { exact: true })).toBeVisible();
  const shortcuts = page.locator('[data-part="tile-strip"] a');
  await expect(shortcuts).toHaveCount(4);
  for (const shortcut of await shortcuts.all()) {
    expect((await shortcut.boundingBox())!.height).toBeLessThanOrEqual(80);
  }
});

test.describe("desktop dashboard", () => {
  test.use({ isMobile: false, hasTouch: false });
  for (const width of [768, 1440]) {
    for (const theme of ["light", "dark"]) {
      test(`keeps the existing desktop presentation at ${width}px in ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/?kind=dashboard&theme=${theme}`);
        await page.evaluate(() => document.fonts.ready);
        for (const img of await page.locator("img").all()) await expect(img).toHaveJSProperty("complete", true);
        await expect(page.getByRole("button", { name: "How it works", exact: true })).toHaveCSS("height", "48px");
        const view = page.getByRole("link", { name: "View request", exact: true });
        if (width === 768) await expect(view).toHaveCSS("height", "54px");
        else expect((await view.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        for (const name of services) {
          const shortcut = page.getByRole("link", { name, exact: true });
          expect((await shortcut.boundingBox())!.height).toBe(96);
          expect((await shortcut.locator("img").boundingBox())!.width).toBe(96);
        }
        await page.screenshot({ path: `artifacts/mobile-dialogs/dashboard-${width}-${theme}.png`, fullPage: true, animations: "disabled" });
      });
    }
  }
});
