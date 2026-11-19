import { expect, test, type Page } from "@playwright/test";

async function openDialog(page: Page, query = "") {
  await page.goto(`/${query}`);
  await page.getByRole("button", { name: "Open confirmation", exact: true }).click();
  const dialog = page.getByRole("dialog").or(page.getByRole("alertdialog"));
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("opacity", "1");
  return dialog;
}

async function checkFit(page: Page) {
  const dialog = page.getByRole("dialog").or(page.getByRole("alertdialog"));
  const bounds = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      width: innerWidth, height: innerHeight, overflow: element.scrollWidth - element.clientWidth };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width + 1);
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.height + 1);
  expect(bounds.overflow).toBeLessThanOrEqual(1);
  for (const button of await dialog.getByRole("button").all()) {
    await button.scrollIntoViewIfNeeded();
    const rect = await button.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(bounds.left);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(bounds.right + 1);
    await expect(button).toBeInViewport();
    expect(await button.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  }
}

for (const width of [320, 393, 768, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`registration confirmation fits ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await openDialog(page, `?theme=${theme}`);
      await checkFit(page);
      await page.screenshot({ path: `artifacts/mobile-dialogs/track-${width}-${theme}.png` });
    });
  }
}

for (const service of ["marriage", "death"]) {
  test(`${service} registration uses the responsive confirmation`, async ({ page }) => {
    await openDialog(page, `?service=${service}`);
    await checkFit(page);
  });
}

for (const kind of ["draft", "leave", "alert"]) {
  for (const theme of ["light", "dark"]) {
    test(`${kind} confirmation fits narrow mobile in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await openDialog(page, `?kind=${kind}&theme=${theme}`);
      await checkFit(page);
      await page.screenshot({ path: `artifacts/mobile-dialogs/${kind}-320-${theme}.png` });
    });
  }
}

test("long copy and larger text remain scrollable on a short phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 480 });
  await openDialog(page, "?large&long");
  await checkFit(page);
  await page.getByRole("button", { name: "Switch to On-Time Registration", exact: true }).click();
  await expect(page.getByLabel("Result")).toHaveText("Registration switched; answers retained");
});

for (const width of [320, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`document preview fits ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 780 });
      await openDialog(page, `?kind=preview&theme=${theme}`);
      await checkFit(page);
      await expect(page.getByRole("img", { name: "Certificate of Live Birth", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Close preview", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });
  }
}

test("Edit date and Escape return focus, while switching calls its existing action", async ({ page }) => {
  await openDialog(page);
  const confirm = page.getByRole("button", { name: "Switch to On-Time Registration", exact: true });
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open confirmation", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Open confirmation", exact: true }).click();
  await page.getByRole("button", { name: "Edit date", exact: true }).click();
  await expect(page.getByLabel("Result")).toHaveText("Date retained");
  await page.getByRole("button", { name: "Open confirmation", exact: true }).click();
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Result")).toHaveText("Registration switched; answers retained");
});

test("discard confirmation stays usable on mobile", async ({ page }) => {
  await openDialog(page, "?kind=draft");
  await page.getByRole("button", { name: "Discard draft", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Discard this draft?" })).toBeVisible();
  await checkFit(page);
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Keep your draft?" })).toBeVisible();
});
