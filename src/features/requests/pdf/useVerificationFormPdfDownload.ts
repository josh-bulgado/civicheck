import { useState } from "react";
import type { VerificationFormPdfData } from "~/features/requests/pdf/types";

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
