import { createRoot } from "react-dom/client";
import type { ComponentProps } from "react";
import { ReportSheet } from "../../src/features/admin/reports/components/ReportSheet";
import { printElement } from "../../src/lib/print";
import { useAcknowledgmentPdfDownload } from "../../src/features/requests/pdf/useAcknowledgmentPdfDownload";
import { useVerificationFormPdfDownload } from "../../src/features/requests/pdf/useVerificationFormPdfDownload";
import { acknowledgmentFixtures, verificationFixtures } from "./pdf-fixtures";
import "../../src/styles/app.css";

const scenario = new URLSearchParams(location.search).get("scenario") || "normal";
const count = scenario === "empty" ? 0 : scenario === "long" ? 60 : 25;
const quarterly = scenario === "quarterly";
const props: ComponentProps<typeof ReportSheet> = {
  sections: { summary: true, volume: true, services: true, seasons: true, signatures: true },
  summary: { requests: count * 1000, released: count * 700, open: count * 200, rejected: count * 100, sentBack: count * 50,
    releasedPercent: count ? 70 : null, sentBackPercent: count ? 5 : null, avgDays: count ? 3.5 : null, releaseSample: count * 700, topService: null, dominantRelease: null },
  buckets: Array.from({ length: quarterly ? 20 : 12 }, (_, index) => ({
    key: quarterly ? `${2022 + Math.floor(index / 4)}-Q${index % 4 + 1}` : `2026-${String(index + 1).padStart(2, "0")}`,
    label: quarterly ? `Q${index % 4 + 1} ${2022 + Math.floor(index / 4)}` : `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][index]} 2026`,
    count: count ? 500 + index * 100 : 0, current: index === 11,
  })),
  services: Array.from({ length: count }, (_, index) => ({
    key: String(index), label: `SERVICE ${index}: ${index % 2 ? "Petition under R.A. 9048 / R.A. 10172 - Change of First Name or Correction of Sex/Date of Birth" : "Registration of Court Decrees/Orders (Annulment or Declaration of Nullity of Marriage)"}${scenario === "long" ? " - Additional civil registry supporting records and annotations" : ""}`,
    departmentId: null, total: 1000, released: 700, incomplete: 50, rejected: 100, pending: 200, walkIn: 300, eventDated: 800,
    avgReleaseDays: index % 2 ? 3.5 : null, releaseSample: 700, asksPurpose: false, eventDateLabel: null, eventDateDirection: "past",
  })),
  periodLabel: quarterly ? "January 1, 2022 to November 14, 2026" : "January 1, 2026 to November 14, 2026",
  busySeason: null,
  generatedLabel: "Nov 14, 2026, 10:30 AM",
};
if (scenario === "selected") props.sections = { summary: true, volume: false, services: false, seasons: false, signatures: true };

function PdfDownloadAudit() {
  const acknowledgment = useAcknowledgmentPdfDownload();
  const verification = useVerificationFormPdfDownload();
  return <>
    <button type="button" disabled={acknowledgment.downloading}
      onClick={() => void acknowledgment.download(acknowledgmentFixtures()[1].data)}>Download acknowledgment</button>
    <button type="button" disabled={verification.downloading}
      onClick={() => void verification.download(verificationFixtures().find(fixture => fixture.name === "verification-email-birth-long")!.data)}>Download verification form</button>
  </>;
}

createRoot(document.getElementById("root")!).render(scenario === "pdf" ? <PdfDownloadAudit /> : <>
  <button type="button" onClick={() => void printElement(document.querySelector<HTMLElement>(".report-sheet")!, "Report print audit")}>Print report</button>
  <ReportSheet {...props} />
</>);
