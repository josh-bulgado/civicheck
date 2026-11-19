import { useState } from "react";
import type { AcknowledgmentPdfData } from "~/features/requests/pdf/types";
import { downloadBlob } from "~/features/requests/pdf/downloadBlob";

/**
 * Renders the acknowledgment PDF entirely client-side (QR generation + PDF
 * layout), so re-downloading always reflects whatever data the caller passes
 * in rather than a server-cached snapshot.
 *
 * `@react-pdf/renderer` pulls in its own font/layout engine and is well over
 * a megabyte — dynamically importing it here (and its friends) keeps that
 * weight out of every page that merely offers a download button, loading it
 * only when someone actually clicks.
 */
export function useAcknowledgmentPdfDownload() {
  const [downloading, setDownloading] = useState(false);

  async function download(data: AcknowledgmentPdfData) {
    setDownloading(true);
    try {
      const [{ pdf }, { default: QRCode }, { createRequestAcknowledgmentPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("qrcode"),
        import("~/features/requests/pdf/RequestAcknowledgmentPdf"),
      ]);

      // Rendered at 168pt (~59mm), with a four-module quiet zone for scanning.
      const qrDataUrl = await QRCode.toDataURL(data.trackingNumber, { margin: 4, width: 720 });
      const blob = await pdf(
        createRequestAcknowledgmentPdf({ data, qrDataUrl, generatedAt: new Date() }),
      ).toBlob();

      downloadBlob(blob, `CiviCheck-${data.trackingNumber}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return { download, downloading };
}
