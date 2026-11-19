import { expect, test, type Page } from "@playwright/test";

const longFileName = `480485727_108013485729384756_${"supporting-document-page-".repeat(5)}01.png`;
const imageBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1kAAAAASUVORK5CYII=", "base64");

async function checkMobileUploadFit(page: Page) {
  const width = page.viewportSize()!.width;
  // Mobile browsers can expand innerWidth to the overflowing layout itself.
  // Compare with the requested phone width so that expansion cannot pass.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  for (const element of await page.locator('h1, article, article [data-slot="item"], article button').all()) {
    const bounds = await element.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
  }
}

async function dragFile(page: Page) {
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(new File(["%PDF-1.4\n%%EOF"], "dropped.pdf", { type: "application/pdf" }));
    return data;
  });
  await page.locator("article").dispatchEvent("dragenter", { dataTransfer: transfer });
  return transfer;
}

for (const width of [320, 393, 767]) {
  for (const theme of ["light", "dark"]) {
    test(`mobile uploads omit the summary and drag-and-drop at ${width}px (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?kind=uploads&theme=${theme}&holdUpload=1`);
      await expect(page.getByRole("heading", { name: "Upload your documents" })).toBeVisible();
      await expect(page.getByText("Details so far", { exact: true })).toBeHidden();
      await expect(page.getByText(/drag in several/)).toBeHidden();
      await expect(page.getByText("or drag and drop files here", { exact: true })).toBeHidden();
      await expect(page.getByRole("button", { name: "Take photo", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Choose files", exact: true })).toBeVisible();
      await expect(page.locator("article")).toHaveCSS("border-top-style", "solid");

      const transfer = await dragFile(page);
      await expect(page.getByText("Drop to add to this document.")).toHaveCount(0);
      await page.locator("article").dispatchEvent("drop", { dataTransfer: transfer });
      expect(await page.evaluate(() => localStorage.getItem("fixture-upload-count"))).toBeNull();
      await transfer.dispose();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/mobile-dialogs/uploads-${width}-${theme}.png`, fullPage: true });

      const chooserPromise = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Choose files", exact: true }).click();
      const chooser = await chooserPromise;
      await chooser.setFiles({ name: longFileName, mimeType: "image/png", buffer: imageBuffer });
      await expect(page.locator("article")).toHaveAttribute("aria-busy", "true");
      await checkMobileUploadFit(page);
      await page.screenshot({ path: `artifacts/mobile-dialogs/uploading-${width}-${theme}.png`, fullPage: true });
      await page.evaluate(() => window.dispatchEvent(new Event("release-upload")));
      await expect(page.getByText(`File 1 · ${longFileName}`, { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
      const preview = page.getByRole("button", { name: /^Preview File 1 of/ });
      await expect(preview).toBeVisible();
      await expect(preview.locator("img")).toBeVisible();
      expect(await preview.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await checkMobileUploadFit(page);
      await page.screenshot({ path: `artifacts/mobile-dialogs/uploaded-${width}-${theme}.png`, fullPage: true });

      const cameraPromise = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Add photo", exact: true }).click();
      const camera = await cameraPromise;
      expect(await camera.element().getAttribute("capture")).toBe("environment");
    });
  }
}

test.describe("desktop uploads", () => {
  test.use({ isMobile: false, hasTouch: false });
  for (const width of [768, 1440]) {
    for (const theme of ["light", "dark"]) {
      test(`retains the summary and drag-and-drop at ${width}px (${theme})`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`/?kind=uploads&theme=${theme}`);
        await expect(page.getByText("Details so far", { exact: true })).toBeVisible();
        await expect(page.getByText("Ana Cruz", { exact: true })).toBeVisible();
        await expect(page.getByText(/choose or drag in several/)).toBeVisible();
        await expect(page.getByText("or drag and drop files here", { exact: true })).toBeVisible();
        await expect(page.locator("article")).toHaveCSS("border-top-style", "dashed");
        await expect(page.locator("article")).toHaveCSS("border-top-width", "2px");
        await page.screenshot({ path: `artifacts/mobile-dialogs/uploads-${width}-${theme}.png`, fullPage: true });

        const transfer = await dragFile(page);
        await expect(page.getByText("Drop to add to this document.")).toBeVisible();
        await page.locator("article").dispatchEvent("drop", { dataTransfer: transfer });
        await expect(page.getByText(/dropped\.pdf/)).toBeVisible();
        await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
        await transfer.dispose();

        await page.setViewportSize({ width: 393, height: 900 });
        await expect(page.getByText("Details so far", { exact: true })).toBeHidden();
        await page.setViewportSize({ width, height: 1000 });
        await expect(page.getByText("Details so far", { exact: true })).toBeVisible();
      });
    }
  }
});
