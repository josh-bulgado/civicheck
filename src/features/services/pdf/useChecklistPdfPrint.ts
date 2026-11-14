import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Service, ServiceRequirement } from "~/features/admin/services/services.types";
import { downloadBlob } from "~/features/requests/pdf/downloadBlob";

/** Generate only on demand, keeping the PDF layout engine out of the public page bundle. */
export function useChecklistPdfPrint() {
  const [printingCode, setPrintingCode] = useState<string | null>(null);
  const busy = useRef(false);

  async function printChecklist(service: Service, requirements: ServiceRequirement[]) {
    if (busy.current) return;
    busy.current = true;
    setPrintingCode(service.service_code);
    let preview: Window | null = null;

    try {
      // Reserve the tab during the click, before awaiting chunks or PDF rendering.
      // Browsers would otherwise treat it as an unsolicited popup.
      preview = window.open("", "_blank");
      if (preview) {
        preview.opener = null;
        preview.document.title = "Preparing checklist PDF";
        preview.document.body.textContent = "Preparing your checklist PDF...";
      }

      const [{ pdf }, { createServiceChecklistPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("~/features/services/pdf/ServiceChecklistPdf"),
      ]);
      const blob = await pdf(createServiceChecklistPdf({ service, requirements, generatedAt: new Date() })).toBlob();

      if (preview && !preview.closed) {
        const url = URL.createObjectURL(blob);
        preview.location.replace(url);
        // The native viewer retains the loaded document for printing/downloading.
        window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
      } else {
        const code = service.service_code.replace(/[^a-z0-9_-]/gi, "-");
        downloadBlob(blob, `CiviCheck-Checklist-${code}.pdf`);
      }
    } catch {
      preview?.close();
      toast.error("We couldn't create the checklist PDF. Please try Print again.");
    } finally {
      busy.current = false;
      setPrintingCode(null);
    }
  }

  return { printChecklist, printingCode };
}
