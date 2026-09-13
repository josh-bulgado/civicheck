/** Content for the applicant's downloadable request acknowledgment PDF. */
export interface AcknowledgmentDocument {
  id: string;
  requirementName: string;
  subjectRole: string | null;
  /** The attachment's own review result, independent of the request status. */
  verificationStatus: string;
  rejectionReason: string | null;
}

export interface AcknowledgmentPdfData {
  trackingNumber: string;
  serviceName: string;
  /** Raw `requests.status` value — rendered through getStatusDetails for its label. */
  status: string;
  submittedAt: string;
  feesDue: number;
  processingTime: string | null;
  /** Only files successfully attached to this request. One entry per upload. */
  documents: AcknowledgmentDocument[];
  documentWarning?: string;
}
