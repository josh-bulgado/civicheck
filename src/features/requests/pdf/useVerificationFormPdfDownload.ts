import { useState } from "react";
import type { VerificationFormPdfData } from "~/features/requests/pdf/types";
import { downloadBlob } from "~/features/requests/pdf/downloadBlob";

/** Build the same PDF for downloads and staff validation previews. */
export async function buildVerificationFormPdf(data: VerificationFormPdfData) {
  const [{ pdf }, { default: QRCode }, { VerificationFormPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("qrcode"),
    import("~/features/requests/pdf/VerificationFormPdf"),
  ]);

  const qrDataUrl = await QRCode.toDataURL(data.trackingNumber, { margin: 2, width: 360 });
  return pdf(
    VerificationFormPdf({ data, qrDataUrl, generatedAt: new Date() }),
  ).toBlob();

}

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
      const blob = await buildVerificationFormPdf(data);

      downloadBlob(
        blob,
        `CiviCheck-Verification-Form-${data.trackingNumber}.pdf`,
      );
    } finally {
      setDownloading(false);
    }
  }

  return { download, downloading };
}
