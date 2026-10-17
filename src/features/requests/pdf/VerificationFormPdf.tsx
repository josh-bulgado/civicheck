import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { VerificationFormPdfData } from "~/features/requests/pdf/types";

// Wrap whole words instead of splitting them with a hyphen ("regis-tered"), so
// names and places stay readable. Set globally, and again on each answer below
// because the per-text setting is the one the layout engine always honors.
const keepWordsWhole = (word: string) => [word];
Font.registerHyphenationCallback(keepWordsWhole);

// While the CCRO has not approved this layout, every copy is marked SAMPLE so it
// cannot be mistaken for the office's own form. Set to false once they sign off.
const SHOW_SAMPLE_MARK = true;

const INK = "#111111";
const MUTED = "#555555";

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "long",
  timeZone: "UTC", // answers are date-only, so read them as the same calendar day
});
const shortDateFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const todayFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "long",
  timeZone: "Asia/Manila",
});
const stampFormatter = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

/** The answer for `key` as trimmed text, or "". */
function text(data: VerificationFormPdfData["formData"], key: string) {
  const value = data[key];
  return value == null ? "" : String(value).trim();
}

function dateText(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

/** A shorter date ("Mar 4, 2001") for the narrow "if yes when?" line. */
function shortDateText(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : shortDateFormatter.format(date);
}

/** Names are stored in parts; "N/A" is what a ticked "no middle name" saves. */
function nameText(...parts: string[]) {
  return parts.filter((part) => part && part !== "N/A").join(" ");
}

const RELATIONSHIPS: Record<string, string> = {
  owner: "Owner (self)",
  parent: "Parent",
  spouse: "Spouse",
  child: "Son/Daughter",
  institution: "Institution-in-charge",
  representative: "Authorized representative",
};

type Row = { label: string; value: string };

/** The owner's rows differ by record type, as they do on the paper forms. */
function ownerRows(data: VerificationFormPdfData["formData"], recordType: string) {
  const ownerName = nameText(
    text(data, "subject_first_name"),
    text(data, "subject_middle_name"),
    text(data, "subject_last_name"),
    text(data, "subject_suffix"),
  );
  switch (recordType) {
    case "death":
      return {
        rows: [
          { label: "Full Name of the Deceased", value: ownerName },
          { label: "Date of Death", value: dateText(text(data, "death_date")) },
          { label: "Place of Death", value: text(data, "death_place") },
        ] satisfies Row[],
        showsLateRegistration: true,
      };
    case "marriage":
      return {
        rows: [
          { label: "Name of Husband", value: ownerName },
          { label: "Maiden Name of Wife", value: text(data, "wife_maiden_name") },
          { label: "Date of Marriage", value: dateText(text(data, "marriage_date")) },
          { label: "Place of Marriage", value: text(data, "marriage_place") },
        ] satisfies Row[],
        showsLateRegistration: true,
      };
    case "birth":
      return {
        rows: [
          { label: "Full Name", value: ownerName },
          { label: "Date of Birth", value: dateText(text(data, "event_date")) },
          { label: "Place of Birth", value: text(data, "event_place") },
          { label: "Maiden Name of Mother", value: text(data, "mother_maiden_name") },
          { label: "Name of Father", value: text(data, "father_name") },
        ] satisfies Row[],
        showsLateRegistration: true,
      };
    default:
      return {
        rows: [
          { label: "Full Name", value: ownerName },
          { label: "Date on the Record", value: dateText(text(data, "record_date")) },
          { label: "Place on the Record", value: text(data, "record_place") },
        ] satisfies Row[],
        showsLateRegistration: false,
      };
  }
}

function recordTitle(data: VerificationFormPdfData["formData"], recordType: string) {
  if (recordType === "other") {
    return (text(data, "record_type_other") || "Civil Registry Record").toUpperCase();
  }
  return (recordType || "record").toUpperCase();
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: INK,
    backgroundColor: "#ffffff",
  },
  watermark: {
    position: "absolute",
    top: 330,
    left: 70,
    fontSize: 110,
    fontWeight: 700,
    color: "#ededed",
    transform: "rotate(-28deg)",
  },
  trackingBox: { position: "absolute", top: 30, right: 44, width: 84, alignItems: "center" },
  qr: { width: 64, height: 64 },
  trackingLabel: { fontSize: 6.5, color: MUTED, marginTop: 2 },
  trackingValue: { fontSize: 7.5, fontWeight: 700, textAlign: "center" },
  headerLine: { textAlign: "center", fontSize: 10 },
  headerOffice: { textAlign: "center", fontSize: 12, fontWeight: 700, marginTop: 2 },
  headerCity: { textAlign: "center", fontSize: 10, marginTop: 1 },
  title: { textAlign: "center", fontSize: 13.5, fontWeight: 700, marginTop: 20 },
  recordType: {
    textAlign: "center",
    fontSize: 13.5,
    fontWeight: 700,
    marginTop: 4,
    textDecoration: "underline",
  },
  sectionHeading: { fontSize: 9.5, fontWeight: 700, marginTop: 20, marginBottom: 7 },
  split: { flexDirection: "row" },
  left: { flex: 1, paddingRight: 18 },
  right: { width: 170 },
  // The label stays level with the first line, so a long answer that wraps
  // flows downward under the same label instead of pushing it to the bottom.
  field: { flexDirection: "row", alignItems: "flex-start", marginBottom: 9 },
  fieldLabel: { fontSize: 10 },
  fieldLine: {
    flex: 1,
    marginLeft: 5,
    borderBottomWidth: 0.9,
    borderBottomColor: INK,
    minHeight: 14,
    justifyContent: "flex-end",
  },
  fieldValue: { fontSize: 10.5, fontWeight: 700, paddingBottom: 1 },
  lateRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 3, marginBottom: 4 },
  lateText: { fontSize: 10, marginRight: 8 },
  certify: { textAlign: "center", fontStyle: "italic", fontSize: 10.5, marginTop: 22 },
  signatureWrap: { alignItems: "flex-end", marginTop: 22 },
  signatureLine: { width: 230, borderBottomWidth: 0.9, borderBottomColor: INK, height: 26 },
  signatureLabel: { width: 230, textAlign: "center", fontSize: 10, marginTop: 3 },
  remarks: { marginTop: 22, fontSize: 9 },
  remarksList: { flexDirection: "row", marginTop: 5 },
  remarksColumn: { flex: 1 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 7,
    color: MUTED,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function Field({ label, value }: Row) {
  return (
    <View style={styles.field} wrap={false}>
      <Text style={styles.fieldLabel}>{label}:</Text>
      <View style={styles.fieldLine}>
        <Text style={styles.fieldValue} hyphenationCallback={keepWordsWhole}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const box = (ticked: boolean) => (ticked ? "( X )" : "(    )");

export interface VerificationFormPdfProps {
  data: VerificationFormPdfData;
  /** Data URL encoding the tracking number, generated by the caller. */
  qrDataUrl: string;
  generatedAt: Date;
}

export function VerificationFormPdf({ data, qrDataUrl, generatedAt }: VerificationFormPdfProps) {
  const answers = data.formData;
  const recordType = text(answers, "record_type");
  const owner = ownerRows(answers, recordType);

  const requesterName = nameText(
    text(answers, "requester_first_name"),
    text(answers, "requester_middle_name"),
    text(answers, "requester_last_name"),
  );
  const relationshipKey = text(answers, "requester_relationship");
  const relationship = RELATIONSHIPS[relationshipKey] ?? relationshipKey;
  const contact = text(answers, "contact_number");
  const registeredLate = text(answers, "registered_late");

  return (
    <Document
      title={`Verification Form ${data.trackingNumber}`}
      author="CiviCheck | City Civil Registrar Office, Legazpi"
      language="en-PH"
    >
      <Page size="A4" style={styles.page}>
        {SHOW_SAMPLE_MARK ? <Text style={styles.watermark} fixed>SAMPLE</Text> : null}

        <View style={styles.trackingBox}>
          <Image src={qrDataUrl} style={styles.qr} />
          <Text style={styles.trackingLabel}>TRACKING NO.</Text>
          <Text style={styles.trackingValue}>{data.trackingNumber}</Text>
        </View>

        <Text style={styles.headerLine}>Republic of the Philippines</Text>
        <Text style={styles.headerOffice}>OFFICE OF THE CITY CIVIL REGISTRAR</Text>
        <Text style={styles.headerCity}>Legazpi City</Text>

        <Text style={styles.title}>APPLICATION FOR CERTIFIED TRUE XEROX COPY</Text>
        <Text style={styles.recordType}>{recordTitle(answers, recordType)}</Text>

        <View style={styles.split}>
          <View style={styles.left}>
            <Text style={styles.sectionHeading}>
              Owner&apos;s Personal Information:
              {recordType === "birth" ? " (Married female: use Maiden Name)" : ""}
            </Text>
            {owner.rows.map((row) => (
              <Field key={row.label} {...row} />
            ))}
            {owner.showsLateRegistration ? (
              <View style={styles.lateRow} wrap={false}>
                <Text style={styles.lateText}>Registered late?</Text>
                <Text style={styles.lateText}>NO {box(registeredLate === "no")}</Text>
                <Text style={styles.lateText}>YES {box(registeredLate === "yes")}</Text>
                <Text style={styles.lateText}>If yes when?</Text>
                <View style={[styles.fieldLine, { marginLeft: 0 }]}>
                  <Text style={[styles.fieldValue, { fontSize: 9.5 }]}>
                    {shortDateText(text(answers, "registered_late_when"))}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.right}>
            <Text style={[styles.sectionHeading, { opacity: 0 }]}>.</Text>
            <Field label="No. Copies" value={String(data.copies)} />
          </View>
        </View>

        <View style={styles.split}>
          <View style={styles.left}>
            <Text style={styles.sectionHeading}>Requester&apos;s Information:</Text>
            <Field label="Full Name" value={requesterName} />
            <Field label="Relationship to the Owner" value={relationship} />
            <Field label="Address" value={text(answers, "requester_address")} />
            <Field label="Purpose (pls. specify)" value={text(answers, "purpose_of_request")} />
          </View>
          <View style={styles.right}>
            <Text style={[styles.sectionHeading, { opacity: 0 }]}>.</Text>
            <View style={{ height: 14 + 9 }} />
            <View style={{ height: 14 + 9 }} />
            <Field label="Contact No." value={contact ? `+63 ${contact}` : ""} />
            <Field label="Date" value={todayFormatter.format(generatedAt)} />
          </View>
        </View>

        <Text style={styles.certify}>I hereby certify that the above information is true and correct.</Text>

        <View style={styles.signatureWrap} wrap={false}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Signature of the Requester</Text>
        </View>

        <View style={styles.remarks} wrap={false}>
          <Text>
            Remarks: Authorization letter with I.D bearing the signature of the authorizing party is
            required if the person is not any of the ff:
          </Text>
          <View style={styles.remarksList}>
            <View style={styles.remarksColumn}>
              <Text>1. Owner of the document</Text>
              <Text style={{ marginTop: 3 }}>2. His/her Parents</Text>
            </View>
            <View style={styles.remarksColumn}>
              <Text>3. His/her Spouse</Text>
              <Text style={{ marginTop: 3 }}>4. Son/Daughter</Text>
            </View>
            <View style={styles.remarksColumn}>
              <Text>5. The Institution-in-charge</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            Prepared through CiviCheck{SHOW_SAMPLE_MARK ? " (sample, not yet approved by the CCRO)" : ""}.
          </Text>
          <Text>Generated {stampFormatter.format(generatedAt)} (UTC+8)</Text>
        </View>
      </Page>
    </Document>
  );
}
