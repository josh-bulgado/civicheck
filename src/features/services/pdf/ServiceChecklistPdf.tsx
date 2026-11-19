import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { Service, ServiceRequirement } from "~/features/admin/services/services.types";
import { documentText } from "~/features/requests/pdf/document-text";
import { cleanStepText, formatPesoFee, parseRequirementName, splitCaseLabel } from "~/features/services/service-utils";

// Keep long requirement names readable without introducing word-splitting hyphens.
Font.registerHyphenationCallback((word) => [word]);

export interface ServiceChecklistPdfProps {
  service: Pick<Service, "service_code" | "name" | "fee" | "display_group" | "processing_time" | "steps_description">;
  requirements: ServiceRequirement[];
  generatedAt: Date;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28, paddingBottom: 24, paddingHorizontal: 38,
    fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.35,
    color: "#172536", backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    height: 32, flexGrow: 0, flexShrink: 0,
    borderBottomWidth: 1.5, borderBottomColor: "#0b4da2", paddingBottom: 7, marginBottom: 12,
  },
  brand: { fontSize: 15, lineHeight: 1.1, fontWeight: 700, color: "#0b4da2" },
  office: { fontSize: 8, lineHeight: 1.3, textAlign: "right", color: "#526174" },
  title: { fontSize: 19, fontWeight: 700, lineHeight: 1.2, marginBottom: 5 },
  subtitle: { fontSize: 8, color: "#526174", marginBottom: 10 },
  facts: { flexDirection: "row", borderWidth: 1, borderColor: "#cbd4df", padding: 10, marginBottom: 4 },
  fact: { width: "50%", paddingRight: 12 },
  label: { fontSize: 8, color: "#526174", marginBottom: 3 },
  value: { fontSize: 11, fontWeight: 700 },
  heading: { fontSize: 11, fontWeight: 700, marginTop: 12, marginBottom: 7 },
  row: { flexDirection: "row", alignItems: "flex-start", marginBottom: 7 },
  checkbox: { width: 9, height: 9, flexShrink: 0, borderWidth: 0.8, borderColor: "#526174", marginTop: 2, marginRight: 9 },
  content: { flex: 1, minWidth: 0 },
  document: { fontWeight: 700 },
  note: { fontSize: 9, lineHeight: 1.3, color: "#526174", marginTop: 2 },
  number: { width: 20, flexShrink: 0, fontWeight: 700, color: "#0b4da2" },
  footer: {
    height: 22, flexGrow: 0, flexShrink: 0, marginTop: 12,
    flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#526174",
    borderTopWidth: 0.5, borderTopColor: "#cbd4df", paddingTop: 7,
  },
  footerText: { fontSize: 8, lineHeight: 1.2, color: "#526174" },
});

const dateFormatter = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });

// Reserve room for the header and footer on every continuation page.
function ChecklistPageLayout({ children, pageNumber, totalPages }: {
  children: ReactNode;
  pageNumber?: number;
  totalPages?: number;
}) {
  return (
    <>
      <View style={styles.header}>
        <Text style={styles.brand}>CiviCheck</Text>
        <Text style={styles.office}>City Civil Registry Office{"\n"}Legazpi City</Text>
      </View>
      <View style={{ flexGrow: 1, flexShrink: 1, minHeight: 0 }}>{children}</View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>CiviCheck | Requirements checklist</Text>
        <Text style={styles.footerText}>Page {pageNumber} of {totalPages}</Text>
      </View>
    </>
  );
}

// The built-in PDF font has no peso glyph. Keep the same fee value as the page.
function text(value: string) {
  return documentText(value).replaceAll("\u20b1", "PHP ");
}

function ChecklistDocuments({ requirements }: { requirements: ServiceRequirement[] }) {
  return requirements.map((requirement) => {
    const { primary, secondary } = parseRequirementName(requirement.requirement_name);
    const { caseLabel } = splitCaseLabel(requirement.requirement_name);
    const note = secondary || requirement.where_to_secure;
    return (
      <View key={requirement.id} style={styles.row} wrap={false}>
        <View style={styles.checkbox} />
        <View style={styles.content}>
          <Text style={styles.document}>{text(primary)}</Text>
          {note ? <Text style={styles.note}>{text(note)}</Text> : null}
          {caseLabel ? <Text style={styles.note}>Applies to: {text(caseLabel)}</Text> : null}
        </View>
      </View>
    );
  });
}

// Export a document factory rather than a Fast Refresh component. An imperative
// PDF render must use the updated module after a layout edit, not a stale
// component export retained by the development browser.
export function createServiceChecklistPdf({ service, requirements, generatedAt }: ServiceChecklistPdfProps) {
  const mandatory = requirements.filter((requirement) => requirement.is_mandatory);
  const conditional = requirements.filter((requirement) => !requirement.is_mandatory);
  const steps = (service.steps_description ?? []).map(cleanStepText).filter(Boolean);

  return (
    <Document title={`${service.name} - Requirements checklist`} author="CiviCheck" language="en-PH">
      <Page size="A4" style={styles.page} layout={ChecklistPageLayout}>
        <Text style={styles.title}>{text(service.name)}</Text>
        <Text style={styles.subtitle}>Requirements checklist | Prepared {dateFormatter.format(generatedAt)}</Text>
        <View style={styles.facts} wrap={false}>
          <View style={styles.fact}>
            <Text style={styles.label}>Total fees</Text>
            <Text style={styles.value}>{text(formatPesoFee(service.fee, service.display_group))}</Text>
            <Text style={styles.note}>Pay at the CCRO cashier</Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.label}>Time at the office</Text>
            <Text style={styles.value}>{text(service.processing_time || "Varies")}</Text>
          </View>
        </View>

        <Text style={styles.heading} minPresenceAhead={40}>Required documents ({mandatory.length})</Text>
        {mandatory.length > 0
          ? <ChecklistDocuments requirements={mandatory} />
          : <Text>No specific required documents are listed for this service.</Text>}

        {conditional.length > 0 ? (
          <View>
            <Text style={styles.heading} minPresenceAhead={40}>Only if it applies to you ({conditional.length})</Text>
            <ChecklistDocuments requirements={conditional} />
          </View>
        ) : null}

        {steps.length > 0 ? (
          <View>
            <Text style={styles.heading} minPresenceAhead={40}>What happens at the office</Text>
            {steps.map((step, index) => (
              <View key={index} style={styles.row} wrap={false}>
                <Text style={styles.number}>{index + 1}.</Text>
                <Text style={styles.content}>{text(step)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
