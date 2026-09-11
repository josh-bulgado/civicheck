import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { STAGE_LABELS, stageOf } from "~/features/requests/request-workflow";
import { getStatusDetails } from "~/features/services/request-status";
import type { AcknowledgmentPdfData } from "~/features/requests/pdf/types";

const WORKFLOW_STEPS = [
  { stage: STAGE_LABELS[1], detail: "Request recorded" },
  { stage: STAGE_LABELS[2], detail: "Documents checked" },
  { stage: STAGE_LABELS[3], detail: "Record prepared" },
  { stage: STAGE_LABELS[4], detail: "Payment checked; document claimed" },
];

// Keep the app's blue, with dark text and mostly white surfaces for printing.
const BRAND = {
  primary: "#0b4da2",
  primarySoft: "#eef3fa",
  foreground: "#172536",
  muted: "#526174",
  border: "#cbd4df",
  subtle: "#f5f7f9",
  attention: "#8f2637",
  white: "#ffffff",
};

// Office-local dates stay consistent even when downloaded from another timezone.
const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});
const feeFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  currencyDisplay: "code", // Built-in PDF fonts do not include the peso glyph.
});

function formatDate(value: Date) {
  return Number.isNaN(value.getTime()) ? "Not available" : dateFormatter.format(value);
}

function nextAction(status: string) {
  switch (status) {
    case "submitted":
      return {
        title: "Your request is awaiting review",
        detail: "Check the submission record below. Follow My Requests in CiviCheck for staff feedback, corrections, and visit instructions.",
      };
    case "under_validation":
      return {
        title: "Your documents are being checked",
        detail: "Check My Requests for staff feedback. If staff ask for corrections or additional documents, follow the instructions on your request.",
      };
    case "incomplete":
      return {
        title: "Action needed: complete your requirements",
        detail: "Open My Requests to review the missing or incorrect documents flagged by staff. Upload corrected files or bring them as instructed.",
      };
    case "rejected":
      return {
        title: "Review the reason for rejection",
        detail: "Open My Requests to read the staff explanation. Contact the CCRO if you need clarification before submitting another request.",
      };
    case "processing":
      return {
        title: "Wait for your release update",
        detail: "Staff are preparing your record. Check My Requests for Ready for Release and collection instructions before visiting to claim it.",
      };
    case "ready_for_release":
      return {
        title: "Your document is ready to claim",
        detail: "Follow the collection instructions in My Requests. Present this QR or tracking number at the CCRO; the cashier confirms any payment due before release.",
      };
    case "released":
      return {
        title: "Your request is complete",
        detail: "Your document has been released. Keep this acknowledgment and tracking number for your records and any follow-up with the CCRO.",
      };
    default:
      return {
        title: "Check your latest request update",
        detail: "Open My Requests in CiviCheck for the current status and staff instructions. Keep this tracking number for any follow-up with the CCRO.",
      };
  }
}

function documentStatusLabel(status: string) {
  switch (status) {
    case "pending": return "Awaiting review";
    case "approved": return "Accepted for pre-validation";
    case "rejected": return "Needs correction";
    default: return "Review status unavailable";
  }
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 66,
    paddingHorizontal: 38,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.45,
    color: BRAND.foreground,
    backgroundColor: BRAND.white,
  },
  runningHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: BRAND.primary,
    paddingBottom: 8,
    marginBottom: 16,
  },
  wordmark: { fontSize: 15, fontWeight: 700, color: BRAND.primary },
  office: { fontSize: 8, textAlign: "right", color: BRAND.muted, lineHeight: 1.4 },
  eyebrow: { fontSize: 8, fontWeight: 700, color: BRAND.muted, letterSpacing: 1 },
  title: { fontSize: 23, fontWeight: 700, lineHeight: 1.2, marginTop: 3 },
  intro: { fontSize: 9, color: BRAND.muted, marginTop: 5 },
  ticket: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 6,
    marginTop: 15,
    padding: 12,
  },
  ticketDetails: { flex: 1, paddingRight: 18, minWidth: 0 },
  label: { fontSize: 8, color: BRAND.muted, marginBottom: 3 },
  trackingNumber: { fontSize: 19, fontWeight: 700, color: BRAND.primary, lineHeight: 1.25 },
  service: { fontSize: 11, fontWeight: 700, marginTop: 9 },
  ticketHint: { fontSize: 8, color: BRAND.muted, marginTop: 6 },
  qrBlock: {
    width: 112,
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: BRAND.border,
    paddingLeft: 14,
  },
  qrImage: { width: 96, height: 96 },
  qrCaption: { fontSize: 8, fontWeight: 700, textAlign: "center", marginTop: 3 },
  action: {
    marginTop: 12,
    padding: 11,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.primary,
    backgroundColor: BRAND.primarySoft,
  },
  actionStatus: { fontSize: 8, color: BRAND.primary, fontWeight: 700, marginBottom: 3 },
  actionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 3 },
  actionDetail: { fontSize: 9, lineHeight: 1.5 },
  summary: { flexDirection: "row", marginTop: 13 },
  summaryItem: { flex: 1, minWidth: 0, paddingRight: 12 },
  summaryLast: { flex: 1, minWidth: 0 },
  summaryValue: { fontSize: 9, fontWeight: 700 },
  summaryNote: { fontSize: 8, color: BRAND.muted, marginTop: 3 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 12, fontWeight: 700 },
  sectionRule: { flex: 1, height: 1, backgroundColor: BRAND.border, marginLeft: 12 },
  sectionHint: { fontSize: 9, color: BRAND.muted, marginBottom: 7 },
  documentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
  },
  documentIndex: { width: 19, fontSize: 9, color: BRAND.muted, marginTop: 1 },
  documentBody: { flex: 1, minWidth: 0, paddingRight: 12 },
  documentName: { fontSize: 10, lineHeight: 1.4 },
  documentNote: { fontSize: 8, color: BRAND.muted, marginTop: 3, lineHeight: 1.45 },
  documentStatus: { width: 105, fontSize: 8, textAlign: "right", color: BRAND.muted, marginTop: 2, lineHeight: 1.4 },
  correctionText: { color: BRAND.attention },
  workflow: { flexDirection: "row", marginTop: 4 },
  step: { flex: 1, paddingRight: 10 },
  stepHeading: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  stepIndex: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 0.8,
    borderColor: BRAND.border,
    textAlign: "center",
    paddingTop: 2,
    fontSize: 8,
    marginRight: 5,
  },
  activeStep: { backgroundColor: BRAND.primary, color: BRAND.white, borderColor: BRAND.primary },
  stepName: { fontSize: 9, fontWeight: 700 },
  stepDetail: { fontSize: 8, color: BRAND.muted, lineHeight: 1.4 },
  visitNote: { fontSize: 9, lineHeight: 1.5, marginTop: 12, padding: 10, backgroundColor: BRAND.subtle },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 38,
    right: 38,
    borderTopWidth: 0.7,
    borderTopColor: BRAND.border,
    paddingTop: 7,
    height: 32,
    fontSize: 7.5,
    color: BRAND.muted,
  },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 2 },
  footerText: { fontSize: 7.5, lineHeight: 1.3 },
  // Reserve space before the renderer resolves the dynamic page number.
  footerPageNumber: { width: "45%", height: 10, textAlign: "right", fontSize: 7.5, lineHeight: 1.3 },
});

export interface RequestAcknowledgmentPdfProps {
  data: AcknowledgmentPdfData;
  /** Data URL encoding the tracking number, generated by the caller. */
  qrDataUrl: string;
  generatedAt: Date;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <View style={styles.sectionTitleRow} minPresenceAhead={65}>
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

export function RequestAcknowledgmentPdf({ data, qrDataUrl, generatedAt }: RequestAcknowledgmentPdfProps) {
  const status = getStatusDetails(data.status);
  const action = nextAction(data.status);
  const currentStage = stageOf(data.status);
  const hasFee = data.feesDue > 0;
  const isClosed = data.status === "released" || data.status === "rejected";

  return (
    <Document title={`CiviCheck Acknowledgment ${data.trackingNumber}`} author="CiviCheck | City Civil Registrar Office, Legazpi" language="en-PH">
      <Page size="A4" style={styles.page}>
        <View style={styles.runningHeader} fixed>
          <Text style={styles.wordmark}>CiviCheck</Text>
          <Text style={styles.office}>{"City Civil Registrar Office\nCity Government of Legazpi"}</Text>
        </View>

        <View wrap={false}>
          <Text style={styles.eyebrow}>YOUR REQUEST RECORD</Text>
          <Text style={styles.title}>Request Acknowledgment</Text>
          <Text style={styles.intro}>Keep this copy for tracking and presenting at the CCRO counter.</Text>
          <View style={styles.ticket}>
            <View style={styles.ticketDetails}>
              <Text style={styles.label}>Tracking number</Text>
              <Text style={styles.trackingNumber}>{data.trackingNumber}</Text>
              <Text style={styles.service}>{data.serviceName}</Text>
              <Text style={styles.ticketHint}>Show the QR to staff, or give them your tracking number.</Text>
            </View>
            <View style={styles.qrBlock}>
              <Image src={qrDataUrl} style={styles.qrImage} />
              <Text style={styles.qrCaption}>For staff to scan</Text>
            </View>
          </View>
        </View>

        <View style={styles.action} wrap={false}>
          <Text style={styles.actionStatus}>STATUS AT DOWNLOAD: {status.label}</Text>
          <Text style={styles.actionTitle}>{action.title}</Text>
          <Text style={styles.actionDetail}>{action.detail}</Text>
        </View>

        <View style={styles.summary} wrap={false}>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Submitted</Text>
            <Text style={styles.summaryValue}>{formatDate(new Date(data.submittedAt))}</Text>
            <Text style={styles.summaryNote}>Philippine time (UTC+8)</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.label}>Recorded request fee</Text>
            <Text style={styles.summaryValue}>{hasFee ? feeFormatter.format(data.feesDue) : "No fee recorded"}</Text>
            <Text style={styles.summaryNote}>{hasFee ? "This copy does not confirm payment." : "Confirm any applicable charges with staff."}</Text>
          </View>
          <View style={styles.summaryLast}>
            <Text style={styles.label}>Estimated processing time</Text>
            <Text style={styles.summaryValue}>{data.processingTime?.trim() || "Confirm with CCRO staff"}</Text>
            <Text style={styles.summaryNote}>{isClosed ? "Service estimate, for reference." : "Check your request for the release update."}</Text>
          </View>
        </View>

        <SectionTitle>Documents Submitted for Pre-validation</SectionTitle>
        <Text style={styles.sectionHint} minPresenceAhead={35}>
          {data.documents.length > 0
            ? "These files were submitted online for staff review. Review results reflect this copy; check My Requests for the latest feedback."
            : "No uploaded documents are recorded for this request. Check My Requests or contact the CCRO for submission instructions."}
        </Text>
        {data.documentWarning ? (
          <Text style={[styles.sectionHint, styles.correctionText]}>{data.documentWarning}</Text>
        ) : null}
        {data.documents.map((document, index) => (
          <View key={document.id} style={styles.documentRow} wrap={false}>
            <Text style={styles.documentIndex}>{index + 1}.</Text>
            <View style={styles.documentBody}>
              <Text style={styles.documentName}>
                {document.requirementName}{document.subjectRole?.trim() ? ` (${document.subjectRole})` : ""}
              </Text>
              {document.verificationStatus === "rejected" ? (
                <>
                  <Text style={[styles.documentNote, styles.correctionText]}>
                    Staff feedback: {document.rejectionReason?.trim() || "Review the staff instructions in My Requests or contact the CCRO for details."}
                  </Text>
                  {!isClosed ? <Text style={styles.documentNote}>Upload a corrected file in My Requests.</Text> : null}
                </>
              ) : null}
            </View>
            <Text style={[styles.documentStatus, ...(document.verificationStatus === "rejected" ? [styles.correctionText] : [])]}>
              {documentStatusLabel(document.verificationStatus)}
            </Text>
          </View>
        ))}

        <View wrap={false}>
          <SectionTitle>Request Process</SectionTitle>
          <View style={styles.workflow}>
            {WORKFLOW_STEPS.map((step, index) => (
              <View key={step.stage} style={styles.step}>
                <View style={styles.stepHeading}>
                  <Text style={[styles.stepIndex, ...(currentStage === index + 1 ? [styles.activeStep] : [])]}>{index + 1}</Text>
                  <Text style={styles.stepName}>{step.stage}</Text>
                </View>
                <Text style={styles.stepDetail}>{step.detail}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.visitNote}>
            {isClosed
              ? "Keep this copy for your records. For any follow-up, review the staff notes in My Requests and give the CCRO your tracking number. The QR identifies this request."
              : "Keep your originals available; bring the documents or copies requested by CCRO staff. The QR identifies your request. Any payment is handled at the CCRO cashier when ready for release."}
          </Text>
        </View>

        <View style={styles.footer} fixed wrap={false}>
          <Text style={styles.footerText}>This acknowledgment is a request record, not an official receipt or civil registry document.</Text>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Generated {formatDate(generatedAt)} (UTC+8)</Text>
            <View style={styles.footerPageNumber} render={({ pageNumber }) => (
              <Text style={styles.footerText}>{data.trackingNumber}  |  Page {pageNumber}</Text>
            )} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
