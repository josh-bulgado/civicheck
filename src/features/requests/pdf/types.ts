/** Content for the applicant's downloadable request acknowledgment PDF. */
export interface AcknowledgmentDocument {
  id: string;
  requirementName: string;
  subjectRole: string | null;
  /** The attachment's own review result, independent of the request status. */
  verificationStatus: string;
  rejectionReason: string | null;
}

/** Content for the printable Verification Form (the CCRO's paper application). */
export interface VerificationFormPdfData {
  trackingNumber: string;
  /** Number of copies requested. */
  copies: number;
  /** The request's answers, keyed by form field (and `subject_*` name keys). */
  formData: Record<string, string | number | boolean | null>;
}

export interface AcknowledgmentPdfData {
  trackingNumber: string;
  serviceName: string;
  /** Raw `requests.status` value — rendered through getStatusDetails for its label. */
  status: string;
  submittedAt: string;
  feesDue: number;
  /** Quantity the fee covers; omitted (or 1) for single-copy requests. */
  copies?: number;
  processingTime: string | null;
  /** Department that handles the service, so the slip can say where to go first. */
  departmentName?: string | null;
  /** Only files successfully attached to this request. One entry per upload. */
  documents: AcknowledgmentDocument[];
  documentWarning?: string;
}
