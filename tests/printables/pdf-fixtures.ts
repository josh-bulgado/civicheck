import type { AcknowledgmentPdfData, VerificationFormPdfData } from "../../src/features/requests/pdf/types";

export const auditDate = new Date("2026-11-14T02:30:00Z");
export const auditTracking = "CCRO-2026-TEST0001";

export function acknowledgmentFixtures() {
  const statuses = ["submitted", "under_validation", "incomplete", "rejected", "processing", "ready_for_release", "released", "cancelled"];
  const cases = statuses.flatMap(status => [false, true].map(long => ({
    name: `acknowledgment-${status}-${long ? "long" : "short"}`,
    data: {
      trackingNumber: auditTracking,
      serviceName: long ? "Petition under R.A. 9048 / R.A. 10172 - Change of First Name or Correction of Sex/Date of Birth" : "Certified True Copy",
      status, submittedAt: auditDate.toISOString(), feesDue: long ? 3200 : 0, copies: long ? 10 : 1,
      processingTime: long ? "3 hours initial processing; publication once a week for two consecutive weeks, followed by review and affirmation of the petition" : "3 working days",
      departmentName: long ? "Legal and Civil Registration Records Review" : "Civil Registration",
      documents: Array.from({ length: long ? 32 : 3 }, (_, index) => ({
        id: `document-${index}`,
        requirementName: long ? `DOCUMENT ${index}: Certified true copy of the certificate or registry-book page containing the entry to be corrected, together with the supporting school, medical, and civil registry records, 1 original and 2 photocopies` : `DOCUMENT ${index}: Valid identification`,
        subjectRole: index % 2 ? "Document owner" : null,
        verificationStatus: index % 3 === 0 ? "rejected" : index % 3 === 1 ? "approved" : "pending",
        rejectionReason: index % 3 === 0 ? `FEEDBACK ${index}: ${long ? "Please submit a clear copy showing the full document, including the signature, seal, and registration details. ".repeat(5) : "Please submit a clear copy."}` : null,
      })),
      ...(long ? { documentWarning: "Some previously uploaded files need correction. Review each item below and follow the staff feedback." } : {}),
    } satisfies AcknowledgmentPdfData,
  })));
  const extended = structuredClone(cases.find(fixture => fixture.name === "acknowledgment-incomplete-long")!);
  extended.name = "acknowledgment-oversized-feedback";
  extended.data.documents = [{ ...extended.data.documents[0], rejectionReason: `${"Please resubmit a clear copy including the original signature, seal, and complete registration details. ".repeat(100)}FEEDBACK-END` }];
  cases.push(extended);
  const empty = structuredClone(cases[0]);
  empty.name = "acknowledgment-no-uploads";
  empty.data.documents = [];
  cases.push(empty);
  return cases;
}

export function verificationFixtures() {
  const cases = [false, true].flatMap(email => (email ? ["birth", "marriage", "death"] : ["birth", "marriage", "death", "other"])
    .flatMap(recordType => [false, true].map(long => ({
      name: `verification-${email ? "email" : "copy"}-${recordType}-${long ? "long" : "short"}`,
      data: {
        trackingNumber: auditTracking, copies: long ? 10 : 1,
        formData: {
          record_type: recordType,
          record_type_other: long ? "Civil registry supplemental record and supporting annotations" : "Supplemental record",
          subject_first_name: long ? "Maria Angela Victoria Concepcion" : "Maria",
          subject_middle_name: long ? "Dela Cruz de los Santos" : "Santos",
          subject_last_name: long ? "Villanueva Santiago Rodriguez" : "Reyes",
          subject_suffix: "Jr.", subject_sex: "female",
          event_date: "2001-03-04", death_date: "2020-03-04", marriage_date: "2020-03-04", record_date: "2001-03-04",
          event_place: long ? "Barangay San Rafael, City of Legazpi, Province of Albay, Region V, Republic of the Philippines" : "Legazpi City",
          death_place: "City of Legazpi, Province of Albay", marriage_place: "City of Legazpi, Province of Albay", record_place: "Legazpi City",
          mother_first_name: long ? "Maria Lourdes Concepcion" : "Ana", mother_middle_name: "Dela Cruz", mother_last_name: "Santos",
          father_name: long ? "Juan Antonio Miguel Villanueva Rodriguez" : "Juan Reyes",
          wife_first_name: long ? "Maria Lourdes Concepcion" : "Ana", wife_middle_name: "Dela Cruz", wife_last_name: "Santos",
          registered_late: "yes", registered_late_when: "2002-04-05",
          requester_first_name: long ? "Maria Angela Victoria Concepcion" : "Maria", requester_middle_name: "Santos", requester_last_name: long ? "Villanueva Santiago Rodriguez" : "Reyes",
          requester_relationship: long ? "representative" : "owner",
          requester_address: long ? "Building 12, Apartment 305, Rizal Extension, San Rafael Subdivision, Barangay San Rafael, Legazpi City, Albay, Republic of the Philippines" : "Legazpi City",
          purpose_of_request: "Other", purpose_of_request_other: long ? "For the processing of an overseas employment application and the verification of the original civil registry record by the requesting agency" : "Personal records",
          contact_number: "9171234567",
          ...(email ? {
            is_record_owner: "yes", reference_number: "2001-123456",
            what_to_verify: long ? `${"Please verify the spelling of the name, the event date, the place of registration, and the supporting annotations on the record. ".repeat(12)}INQUIRY-END` : "Please verify the spelling of the name.",
            additional_notes: long ? `${"This supporting information identifies the civil registry record and explains the request in full. ".repeat(12)}NOTES-END` : "No additional information.",
          } : {}),
        },
      } satisfies VerificationFormPdfData,
    }))));
  const extended = structuredClone(cases.find(fixture => fixture.name === "verification-email-birth-long")!);
  extended.name = "verification-email-oversized-narrative";
  extended.data.formData.what_to_verify = `${"Please verify the recorded name, date of birth, and supporting annotations in the civil registry. ".repeat(90)}INQUIRY-END`;
  extended.data.formData.additional_notes = `${"This information identifies the requested civil registry record and explains the request in full. ".repeat(70)}NOTES-END`;
  cases.push(extended);
  const signed = structuredClone(cases.find(fixture => fixture.name === "verification-copy-birth-long")!);
  signed.name = "verification-copy-overseas-signed";
  Object.assign(signed.data.formData, {
    requester_country: "United States", requester_address_line1: "Apartment 305, Civil Registry Records Sample Building",
    requester_address_line2: "1234 Sample Avenue, North District", requester_overseas_city: "Los Angeles",
    requester_overseas_region: "California", requester_postal_code: "90001", requester_signature: "data:image/png;base64,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",
  });
  cases.push(signed);
  const empty = structuredClone(cases[0]);
  empty.name = "verification-blank-optional-answers";
  empty.data.formData = { record_type: "birth" } as typeof empty.data.formData;
  cases.push(empty);
  return cases;
}
