import type { AcknowledgmentPdfData } from "~/features/requests/pdf/types";

// Exercise the real ReviewStep success screen without submitting a live request.
export async function submitRequestFn() {
  return {
    error: false,
    requestId: "fixture-submitted-request",
    trackingNumber: "CCRO-2026-860259",
    pdfData: {
      trackingNumber: "CCRO-2026-860259",
      serviceName: "On-Time Registration of Certificate of Live Birth",
      status: "for_validation",
      submittedAt: "2026-11-14T04:00:00Z",
      feesDue: 0,
      processingTime: "Staff validation",
      documents: [],
    } satisfies AcknowledgmentPdfData,
  };
}
