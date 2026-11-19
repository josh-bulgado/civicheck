import { beforeAll, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import QRCode from "qrcode";
import { createRequestAcknowledgmentPdf } from "./RequestAcknowledgmentPdf";
import { createVerificationFormPdf } from "./VerificationFormPdf";
import { acknowledgmentFixtures, verificationFixtures, auditDate, auditTracking } from "../../../../tests/printables/pdf-fixtures";

let qrDataUrl: string;
beforeAll(async () => { qrDataUrl = await QRCode.toDataURL(auditTracking, { width: 360, margin: 4 }); });

async function inspect(bytes: Buffer, footer: string) {
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  const pdf = await task.promise;
  try {
    const pages: string[] = [];
    for (let index = 1; index <= pdf.numPages; index++) {
      const content = await (await pdf.getPage(index)).getTextContent();
      const items = content.items.filter(item => "str" in item);
      const text = items.map(item => item.str).join(" ").replace(/\s+/g, " ");
      expect(text).toContain(footer);
      for (const item of items) if (item.str.trim() && item.str !== "SAMPLE") {
        expect(item.transform[4], `left edge: ${item.str}`).toBeGreaterThanOrEqual(20);
        expect(item.transform[4] + item.width, `right edge: ${item.str}`).toBeLessThanOrEqual(578);
        expect(item.transform[5], `bottom edge: ${item.str}`).toBeGreaterThanOrEqual(16);
        expect(item.transform[5], `top edge: ${item.str}`).toBeLessThanOrEqual(830);
      }
      pages.push(text);
    }
    return pages;
  } finally { await task.destroy(); }
}

it.each(acknowledgmentFixtures())("$name keeps every document, feedback, and footer", async ({ data }) => {
  const bytes = await renderToBuffer(createRequestAcknowledgmentPdf({ data, qrDataUrl, generatedAt: auditDate }));
  const pages = await inspect(bytes, "This acknowledgment is a request record");
  for (const [index, page] of pages.entries()) {
    expect(page).toContain("City Civil Registrar Office");
    expect(page).toContain(`Page ${index + 1}`);
  }
  const text = pages.join(" ");
  for (let index = 0; index < data.documents.length; index++) {
    expect(text).toContain(`DOCUMENT ${index}:`);
    const reason = data.documents[index].rejectionReason;
    if (reason && reason.length <= 2000) {
      const documentPage = pages.find(page => page.includes(`DOCUMENT ${index}:`));
      expect(documentPage).toContain(reason.replace(/\s+/g, " "));
    }
  }
  if (JSON.stringify(data).includes("FEEDBACK-END")) expect(text).toContain("FEEDBACK-END");
  if (data.documents.length <= 3 && !JSON.stringify(data).includes("FEEDBACK-END")) expect(pages).toHaveLength(1);
});

it.each(verificationFixtures())("$name keeps full answers with identifying headers on every page", async ({ data }) => {
  const bytes = await renderToBuffer(createVerificationFormPdf({ data, qrDataUrl, generatedAt: auditDate }));
  const pages = await inspect(bytes, "Prepared through CiviCheck");
  for (const [index, page] of pages.entries()) {
    expect(page).toContain("OFFICE OF THE CITY CIVIL REGISTRAR");
    expect(page).toContain(auditTracking);
    expect(page).toContain(`${index + 1}/${pages.length}`);
  }
  const text = pages.join(" ");
  for (const token of ["INQUIRY-END", "NOTES-END"]) if (JSON.stringify(data).includes(token)) expect(text).toContain(token);
  if (JSON.stringify(data).includes("NOTES-END")) {
    expect(pages.at(-1)).toContain("NOTES-END");
    expect(pages.at(-1)).toContain("Sign your Email Request Letter.");
  }
  if (!data.formData.what_to_verify) expect(pages).toHaveLength(1);
});
