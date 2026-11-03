// Wording for the two documents a resident accepts at signup. Kept as plain
// data, apart from any layout, so the CCRO can revise the text without touching
// components. Anything in [square brackets] is a fact only the office can
// supply — it is deliberately left unfilled rather than invented.
//
// DRAFT: written for the capstone prototype. The CCRO / LGU legal office and its
// Data Protection Officer must review it before real-world use.

export type LegalDocumentKey = "terms" | "privacy";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDocument {
  key: LegalDocumentKey;
  title: string;
  /** Short line shown under the title. */
  summary: string;
  effective: string;
  sections: LegalSection[];
}

const EFFECTIVE_PLACEHOLDER = "[Effective date to be set by the CCRO]";

const CONTACT_SECTION: LegalSection = {
  heading: "Contact",
  paragraphs: [
    "City Civil Registrar Office, City Government of Legazpi",
    "[Office address, hours, and contact number to be supplied by the CCRO]",
  ],
};

const terms: LegalDocument = {
  key: "terms",
  title: "Terms of Use",
  summary:
    "The rules for using CiviCheck, the City Civil Registrar Office's online request service.",
  effective: EFFECTIVE_PLACEHOLDER,
  sections: [
    {
      heading: "About CiviCheck",
      paragraphs: [
        "CiviCheck is an online service of the City Civil Registrar Office (CCRO) of Legazpi City. It lets you see the requirements for a civil registry document, submit a request, and follow it from submission to release.",
        "Using CiviCheck does not change how the CCRO legally registers and issues civil registry records.",
      ],
    },
    {
      heading: "Who may use it",
      paragraphs: [
        "You may create an account if you are requesting a document for yourself or are authorized to request it for someone else. By signing up, you confirm that the information you provide is yours to provide.",
      ],
    },
    {
      heading: "Your account",
      paragraphs: [
        "You are responsible for keeping your password confidential and for activity under your account. Tell the CCRO promptly if you think someone else has accessed it. Your account is for your own use and must not be shared.",
      ],
    },
    {
      heading: "Information you provide",
      paragraphs: [
        "Give complete and accurate information, including names and dates exactly as they appear on the civil registry record. Do not submit false, altered, or misleading information or documents.",
        "The CCRO may refuse or hold a request that appears false or inconsistent, and may act as the law allows.",
      ],
    },
    {
      heading: "Requirements checklist and pre-validation uploads",
      paragraphs: [
        "The checklist shows the documents normally needed for each service. Uploading documents in advance is optional and helps CCRO staff review them before your visit.",
        "A pre-validation review does not guarantee that your request will be accepted. CCRO staff make the final check, which can still result in a request being marked incomplete or rejected.",
      ],
    },
    {
      heading: "Request status",
      paragraphs: [
        "Each request moves through submission, validation, processing, and release. The status shown in CiviCheck reflects the latest update made by CCRO staff. CiviCheck does not promise a specific processing time.",
      ],
    },
    {
      heading: "Payment",
      paragraphs: [
        "CiviCheck does not collect or process payments. Fees are paid at the CCRO cashier. The QR code in CiviCheck is used only to verify your payment status.",
        "A document is released only after the cashier has confirmed payment.",
      ],
    },
    {
      heading: "Claiming your document",
      paragraphs: [
        "Documents are released in person at the CCRO. Bring what the CCRO requires at the time of release, such as valid identification or an authorization where applicable.",
      ],
    },
    {
      heading: "Notifications",
      paragraphs: [
        "We send updates about your request inside CiviCheck and by email to the address on your account. CiviCheck does not send SMS messages. Keep your email address current so you do not miss notices.",
      ],
    },
    {
      heading: "Acceptable use",
      paragraphs: ["Do not use CiviCheck to:"],
      items: [
        "submit requests on behalf of others without authority;",
        "interfere with the service or with other users;",
        "try to access accounts or data that are not yours; or",
        "upload harmful files.",
      ],
    },
    {
      heading: "Availability",
      paragraphs: [
        "CiviCheck needs an internet connection and may be unavailable during maintenance or interruptions. The CCRO is not liable for delays caused by events outside its control. Walk-in service at the CCRO remains available.",
      ],
    },
    {
      heading: "Your personal information",
      paragraphs: [
        "How we collect, use, and protect your personal data is described in the Privacy Notice, which forms part of these terms and follows the Data Privacy Act of 2012 (Republic Act No. 10173).",
      ],
    },
    {
      heading: "Changes to these terms",
      paragraphs: [
        "The CCRO may update these terms. The effective date above shows the latest version. Continuing to use CiviCheck after an update means you accept it.",
      ],
    },
    {
      heading: "Governing law",
      paragraphs: [
        "These terms are governed by the laws of the Republic of the Philippines.",
      ],
    },
    CONTACT_SECTION,
  ],
};

const privacy: LegalDocument = {
  key: "privacy",
  title: "Privacy Notice",
  summary:
    "What personal information CiviCheck collects, why, who can see it, and the rights you have over it.",
  effective: EFFECTIVE_PLACEHOLDER,
  sections: [
    {
      heading: "Who we are",
      paragraphs: [
        "CiviCheck is operated by the City Civil Registrar Office (CCRO) of the City Government of Legazpi, which decides how and why your personal information is processed.",
      ],
    },
    {
      heading: "Information we collect",
      items: [
        "Account details: your name, email address, and password.",
        "Profile details you choose to add: date of birth, sex, and mobile number.",
        "Request details: the names, dates, and other particulars of the person or event named on the record, as the service requires, including the details of related parties such as parents or spouses.",
        "Documents you upload for pre-validation.",
        "Payment status: whether a request is unpaid or verified. CiviCheck does not collect card or bank details.",
        "Activity records: sign-ins, request submissions, and administrative actions, kept as audit logs.",
        "Sign-in session information needed to keep you signed in.",
      ],
      paragraphs: [
        "Some of this information, such as age and marital status, is sensitive personal information under the Data Privacy Act and is handled with added care.",
      ],
    },
    {
      heading: "Why we use it",
      items: [
        "to create and secure your account;",
        "to check your request against the requirements for the service;",
        "to process the request and prepare the record;",
        "to notify you of progress by email and inside CiviCheck;",
        "to verify payment status and record the release of the document;",
        "to produce summary reports on request volume, processing time, and incomplete submissions; and",
        "to keep audit logs and protect the system from misuse.",
      ],
    },
    {
      heading: "Basis for processing",
      paragraphs: [
        "We process your information with your consent, which you give by creating an account and submitting a request, and because it is needed for the CCRO to carry out its functions as a government office.",
      ],
    },
    {
      heading: "Who can see it",
      paragraphs: [
        "Access is role-based. Only authorized CCRO personnel can view requests and documents, and each person sees only what their role requires. You can see your own account and requests.",
        "We do not sell your information. We do not share it with other parties except where the law requires or permits.",
        "Technology providers that host CiviCheck and deliver its emails process data on the CCRO's behalf under confidentiality obligations. [Hosting location and provider details to be confirmed by the CCRO and its Data Protection Officer.]",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        "Civil registry records are official records and are kept as the law requires. Other information, such as uploaded documents and account details, is kept only as long as needed for the purposes above. [Retention periods to be set by the CCRO.]",
      ],
    },
    {
      heading: "How we protect it",
      paragraphs: [
        "We use role-based access, audit logs of sign-ins and administrative actions, and encrypted connections. No system is completely risk free, so please keep your password private and sign out on shared devices.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: ["Under the Data Privacy Act of 2012, you have the right to:"],
      items: [
        "be informed about how your data is processed;",
        "access the personal information we hold about you;",
        "object to processing, and withdraw your consent;",
        "correct inaccurate or outdated information;",
        "request the suspension, blocking, or removal of your data, where the law allows;",
        "be indemnified for damages caused by inaccurate, unlawfully obtained, or unauthorized use of your data;",
        "receive your data in a portable format, where applicable; and",
        "file a complaint with the National Privacy Commission.",
      ],
    },
    {
      heading: "Records and corrections",
      paragraphs: [
        "Entries in civil registry records are official and cannot simply be deleted or edited on request. Corrections to a record follow the legal correction procedures of the CCRO, not this notice.",
      ],
    },
    {
      heading: "Changes to this notice",
      paragraphs: [
        "We may update this notice. The effective date above shows the latest version.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "To use your rights or ask a question about your data, contact the CCRO's Data Protection Officer.",
        "[Data Protection Officer name and contact details to be supplied by the CCRO]",
        "City Civil Registrar Office, City Government of Legazpi",
      ],
    },
  ],
};

export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  terms,
  privacy,
};
