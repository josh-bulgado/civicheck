import { useState } from "react";
import type { VerificationFormPdfData } from "~/features/requests/pdf/types";

/**
 * Builds the printable Verification Form in the browser and saves it. Like the
 * acknowledgment, the PDF library is loaded only when someone clicks, so pages
 * that merely offer the button stay light.
 */
export function useVerificationFormPdfDownload() {
  const [downloading, setDownloading] = useState(false);

  async function download(data: VerificationFormPdfData) {
    setDownloading(true);
    try {
      const [{ pdf }, { default: QRCode }, { VerificationFormPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("qrcode"),
        import("~/features/requests/pdf/VerificationFormPdf"),
      ]);

      const qrDataUrl = await QRCode.toDataURL(data.trackingNumber, { margin: 2, width: 360 });
      const blob = await pdf(
        VerificationFormPdf({ data, qrDataUrl, generatedAt: new Date() }),
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `CiviCheck-Verification-Form-${data.trackingNumber}.pdf`;
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
