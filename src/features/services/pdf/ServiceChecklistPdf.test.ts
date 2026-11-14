import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { expect, it } from "vitest";
import type { ServiceRequirement } from "~/features/admin/services/services.types";
import { createServiceChecklistPdf, type ServiceChecklistPdfProps } from "./ServiceChecklistPdf";

const service: ServiceChecklistPdfProps["service"] = {
  service_code: "LONG-CHECKLIST",
  name: "Long requirements checklist",
  fee: 150,
  display_group: null,
  processing_time: "3 working days",
  steps_description: ["Present your papers at the office.", "Pay the fee at the cashier."],
};

async function readPages(requirements: ServiceRequirement[], selectedService = service) {
  const bytes = await renderToBuffer(createServiceChecklistPdf({
    service: selectedService, requirements, generatedAt: new Date("2026-11-14T00:00:00Z"),
  }));
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  const document = await task.promise;
  try {
    const pages: string[] = [];
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index);
      const content = await page.getTextContent();
      const wordmark = content.items.find(item => "str" in item && item.str === "CiviCheck");
      expect(wordmark && "transform" in wordmark && wordmark.transform[5]).toBeGreaterThan(765);
      for (const officeLine of ["City Civil Registry Office", "Legazpi City"]) {
        const line = content.items.find(item => "str" in item && item.str === officeLine);
        expect(line && "transform" in line && line.transform[5]).toBeGreaterThan(765);
      }
      const pageNumber = content.items.find(item => "str" in item && item.str.startsWith("Page "));
      expect(pageNumber && "transform" in pageNumber && pageNumber.transform[5]).toBeGreaterThan(15);
      expect(pageNumber && "transform" in pageNumber && pageNumber.transform[5]).toBeLessThan(60);
      pages.push(content.items.flatMap(item => "str" in item ? [item.str] : []).join(" ").replace(/\s+/g, " "));
      expect(page.view[2]).toBeCloseTo(595.28, 0);
      expect(page.view[3]).toBeCloseTo(841.89, 0);
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

it("keeps every long document and its copy/source note together across A4 page breaks", async () => {
  const requirements = Array.from({ length: 40 }, (_, index): ServiceRequirement => ({
    id: String(index), service_code: service.service_code, requirement_group: null,
    requirement_name: `[For minors] DOCUMENT ${index} ${"Supporting papers and record copies ".repeat(8)}— SOURCE ${index}, 1 original and 2 photocopies`,
    is_mandatory: index < 30, where_to_secure: null, case_tag: null,
    applies_when: null, requires_upload: false, upload_scope: "request", subject_role: null,
  }));
  const pages = await readPages(requirements);
  expect(pages.length).toBeGreaterThan(1);
  for (const [index, page] of pages.entries()) {
    expect(page).toContain("City Civil Registry Office");
    expect(page).toContain(`Page ${index + 1} of ${pages.length}`);
  }
  for (let index = 0; index < requirements.length; index++) {
    const documentPages = pages.filter(page => page.includes(`DOCUMENT ${index} `));
    expect(documentPages, `document ${index} appears once`).toHaveLength(1);
    expect(documentPages[0]).toContain(`SOURCE ${index}, 1 original and 2 photocopies`);
    expect(documentPages[0]).toContain("Applies to: For minors");
  }
  const fullText = pages.join(" ");
  expect(fullText).toContain("Required documents (30)");
  expect(fullText).toContain("Only if it applies to you (10)");
  expect(fullText).toContain("Present your papers at the office.");
  expect(fullText).toContain("Pay the fee at the cashier.");
  expect(fullText).toContain("PHP 150.00");
  expect(fullText).not.toContain("[For minors]");
});

it("keeps the complete marriage-license checklist and office steps on one page", async () => {
  const requirements = Array.from({ length: 9 }, (_, index): ServiceRequirement => ({
    id: `marriage-${index}`, service_code: "MARRIAGE_LICENSE", requirement_group: null,
    requirement_name: `Marriage document ${index}, 1 original and 1 photocopy`,
    is_mandatory: true, where_to_secure: "Issuing office", case_tag: null,
    applies_when: null, requires_upload: false, upload_scope: "request", subject_role: null,
  }));
  const pages = await readPages(requirements, {
    ...service,
    name: "Application and Issuance of Marriage License",
    processing_time: "3 hours; license released after a 10-day posting period",
    steps_description: [
      "Submit the request; staff interview the couple and schedule the counselling session.",
      "Attend the counselling session, pay the required fees, and receive a claim stub.",
      "Claim the marriage license after the posting period.",
    ],
  });
  expect(pages).toHaveLength(1);
  expect(pages[0]).toContain("Marriage document 8");
  expect(pages[0]).toContain("Claim the marriage license after the posting period.");
});

it("handles services without listed requirements or office steps", async () => {
  const pages = await readPages([], { ...service, steps_description: null });
  expect(pages).toHaveLength(1);
  expect(pages[0]).toContain("No specific required documents are listed for this service.");
  expect(pages[0]).not.toContain("What happens at the office");
});

it("preserves the wording of long certificate names without inserting hyphens", async () => {
  const name = "Certified Xerox copy of the Certificate of Finality, Entry of Judgment, Decree of Adoption and Nullity/Annulment of Marriage, 4 original copies";
  const pages = await readPages([{
    id: "court-document", service_code: service.service_code, requirement_group: null,
    requirement_name: name, is_mandatory: true, where_to_secure: "Issuing court",
    case_tag: null, applies_when: null, requires_upload: false,
    upload_scope: "request", subject_role: null,
  }]);
  expect(pages[0]).toContain(name);
  expect(pages[0]).toContain("Issuing court");
});
