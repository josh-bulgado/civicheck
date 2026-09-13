import { useState } from "react";
import type { AcknowledgmentPdfData } from "~/features/requests/pdf/types";

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
      const [{ pdf }, { default: QRCode }, { RequestAcknowledgmentPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("qrcode"),
        import("~/features/requests/pdf/RequestAcknowledgmentPdf"),
      ]);

      // Rendered at 96pt (~34mm), with a four-module quiet zone for scanning.
      const qrDataUrl = await QRCode.toDataURL(data.trackingNumber, { margin: 4, width: 480 });
      const blob = await pdf(
        RequestAcknowledgmentPdf({ data, qrDataUrl, generatedAt: new Date() }),
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `CiviCheck-${data.trackingNumber}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return { download, downloading };
}
