import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { getStatusDetails } from "~/features/services/request-status";
import type { AcknowledgmentPdfData } from "~/features/requests/pdf/types";

// Wrap whole words instead of splitting them mid-word ("han-dles"). This module
// only builds the acknowledgment, so the global setting is contained to it.
Font.registerHyphenationCallback((word) => [word]);

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

/** What to do on arrival, in the order the office actually works. */
function visitSteps(departmentName: string | null | undefined, feesDue: number) {
  const where = departmentName?.trim()
    ? `the ${departmentName.trim()} department`
    : "the CCRO department that handles your request";
  return [
    {
      title: "Present your QR or number",
      detail: `Go to ${where} and show the QR code or tracking number on this slip. Bring your original documents.`,
    },
    feesDue > 0
      ? {
          title: "Pay at the cashier",
          detail: `Then proceed to the CCRO cashier to pay ${feeFormatter.format(feesDue)}. The cashier confirms your payment in the system.`,
        }
      : {
          title: "No payment needed",
          detail: "No fee is recorded for this request. Ask staff to confirm if you are unsure.",
        },
    {
      title: "Wait for your release",
      detail: "Staff hand over your document once it is cleared for release. Keep this slip until you have it.",
    },
  ];
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
  label: { fontSize: 8, color: BRAND.muted, marginBottom: 3 },
  eyebrow: { fontSize: 8, fontWeight: 700, color: BRAND.muted, letterSpacing: 1 },
  title: { fontSize: 23, fontWeight: 700, lineHeight: 1.2, marginTop: 3 },
  intro: { fontSize: 9, color: BRAND.muted, marginTop: 5 },
  // The counter pass: QR + tracking number stacked on the left are what staff
  // actually need, so they get the most room; supporting facts sit beside them.
  ticket: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 6,
    marginTop: 14,
    padding: 14,
  },
  pass: {
    width: 204,
    alignItems: "center",
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: BRAND.border,
  },
  qrImage: { width: 168, height: 168 },
  passLabel: { fontSize: 7.5, fontWeight: 700, color: BRAND.muted, letterSpacing: 1, marginTop: 6 },
  trackingNumber: {
    fontSize: 18,
    fontWeight: 700,
    color: BRAND.primary,
    lineHeight: 1.25,
    marginTop: 2,
    textAlign: "center",
  },
  passHint: { fontSize: 8, color: BRAND.muted, marginTop: 5, textAlign: "center" },
  details: { flex: 1, minWidth: 0, paddingLeft: 16 },
  service: { fontSize: 12, fontWeight: 700, lineHeight: 1.3 },
  action: {
    marginTop: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.primary,
    backgroundColor: BRAND.primarySoft,
  },
  actionStatus: { fontSize: 7.5, color: BRAND.primary, fontWeight: 700, marginBottom: 3 },
  actionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 3 },
  actionDetail: { fontSize: 8.5, lineHeight: 1.45 },
  facts: { marginTop: 8 },
  fact: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
  },
  factLabel: { width: 92, fontSize: 8, color: BRAND.muted, paddingTop: 1 },
  factBody: { flex: 1, minWidth: 0 },
  factValue: { fontSize: 9, fontWeight: 700 },
  factNote: { fontSize: 7.5, color: BRAND.muted, marginTop: 1 },
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
  visit: { flexDirection: "row", marginTop: 4 },
  step: { flex: 1, paddingRight: 12 },
  stepHeading: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  stepIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BRAND.primary,
    color: BRAND.white,
    textAlign: "center",
    paddingTop: 4,
    fontSize: 9,
    fontWeight: 700,
    marginRight: 6,
  },
  stepName: { flex: 1, fontSize: 9.5, fontWeight: 700, lineHeight: 1.3 },
  stepDetail: { fontSize: 8.5, color: BRAND.muted, lineHeight: 1.45 },
  visitNote: { fontSize: 9, lineHeight: 1.5, marginTop: 10, padding: 9, backgroundColor: BRAND.subtle },
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
            <View style={styles.pass}>
              <Image src={qrDataUrl} style={styles.qrImage} />
              <Text style={styles.passLabel}>TRACKING NUMBER</Text>
              <Text style={styles.trackingNumber}>{data.trackingNumber}</Text>
              <Text style={styles.passHint}>Show the QR to staff, or give them this number.</Text>
            </View>
            <View style={styles.details}>
              <Text style={styles.service}>{data.serviceName}</Text>
              <View style={styles.action}>
                <Text style={styles.actionStatus}>STATUS AT DOWNLOAD: {status.label.toUpperCase()}</Text>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDetail}>{action.detail}</Text>
              </View>
              <View style={styles.facts}>
                <View style={styles.fact}>
                  <Text style={styles.factLabel}>Submitted</Text>
                  <View style={styles.factBody}>
                    <Text style={styles.factValue}>{formatDate(new Date(data.submittedAt))}</Text>
                    <Text style={styles.factNote}>Philippine time (UTC+8)</Text>
                  </View>
                </View>
                <View style={styles.fact}>
                  <Text style={styles.factLabel}>Recorded request fee</Text>
                  <View style={styles.factBody}>
                    <Text style={styles.factValue}>{hasFee ? feeFormatter.format(data.feesDue) : "No fee recorded"}</Text>
                    <Text style={styles.factNote}>{hasFee ? "This copy does not confirm payment." : "Confirm any applicable charges with staff."}</Text>
                  </View>
                </View>
                <View style={styles.fact}>
                  <Text style={styles.factLabel}>Estimated processing</Text>
                  <View style={styles.factBody}>
                    <Text style={styles.factValue}>{data.processingTime?.trim() || "Confirm with CCRO staff"}</Text>
                  </View>
                </View>
              </View>
            </View>
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

        {isClosed ? (
          <Text style={styles.visitNote} wrap={false}>
            Keep this copy for your records. For any follow-up, review the staff notes in My Requests and give the CCRO your tracking number. The QR identifies this request.
          </Text>
        ) : (
          <View wrap={false}>
            <SectionTitle>When You Visit the CCRO</SectionTitle>
            <View style={styles.visit}>
              {visitSteps(data.departmentName, data.feesDue).map((step, index) => (
                <View key={step.title} style={styles.step}>
                  <View style={styles.stepHeading}>
                    <Text style={styles.stepIndex}>{index + 1}</Text>
                    <Text style={styles.stepName}>{step.title}</Text>
                  </View>
                  <Text style={styles.stepDetail}>{step.detail}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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
