-- ============================================================
-- Seed: Services & Requirements
-- Source: OCCR Citizen's Charter 2025 (REVISED-CITIZEN-CHARTER-2025-A3.pdf)
-- ============================================================
--
-- NOTES ON SOURCING / RECONSTRUCTION
--
-- 1. Pages 7-10 of the charter have a text-extraction layout glitch where
--    three process tables got shuffled across the Birth Registration,
--    Legitimation, and Death Registration sections. Each table was
--    reattributed to its correct service by matching it against the
--    section's own staff names (which are unique per section and don't
--    move), e.g. "issue annotated COLB" as a CLAIM step only makes sense
--    under Legitimation, not under On-Time Death Registration where it
--    was visually placed.
--    UPDATE: verified against the actual rendered PDF pages (not just the
--    extracted text) on 2026-06-26 -- every figure below (Legitimation
--    P410, Birth-Delayed 80+/out-of-town P500, Death On-Time P120) checks
--    out exactly. The glitch was specific to text extraction, not the
--    source document or this seed data. No corrections needed here.
--
-- 2. Several services (R.A. 9048/10172, R.A. 9255, Court Decrees) don't
--    print a single combined "Total" fee row in the charter -- they only
--    itemize fees by sub-case. Where that happens, `fee` below uses the
--    higher itemized figure as a representative placeholder, flagged
--    inline. Don't treat these as authoritative all-in totals -- compute
--    `requests.fees_due` per-request from the actual case type instead of
--    relying on a flat `services_registry.fee`.
--
-- 3. `service_requirements_metadata` has no "where to secure" column, so
--    that detail is folded into `requirement_name` text below. Consider
--    a follow-up migration adding a dedicated column if you want it
--    queryable/filterable in the UI.
--
-- 4. `is_mandatory = false` means "conditional" (depends on the
--    applicant's specific case), not "optional, skip if you like."
--    Render these as "if applicable" rather than hiding them.
--
-- 5. This file is safe to re-run: services_registry uses ON CONFLICT
--    (it has a PK on service_code), and service_requirements_metadata is
--    cleared for these 16 service_codes before reinserting (it has no
--    natural unique constraint, so a plain re-run would have silently
--    duplicated every checklist item).


-- ============================================================
-- 1. Services Registry
-- ============================================================

insert into public.services_registry
  (service_code, name, classification, fee, processing_time, steps_description)
values

('BIRTH_ONTIME', 'On-Time Registration of Certificate of Live Birth', 'simple', 300.00,
 '2 hours',
 ARRAY[
   'Submit the request with complete attachments; CCRO checks correctness and completeness, then registers and signs.',
   'Pay at the cashier (none for a marital child; AUSF + Admission of Paternity fees for a non-marital child) and receive an Official Receipt.',
   'Claim the registered Certificate of Live Birth.'
 ]),

('BIRTH_DELAYED', 'Delayed Registration of Certificate of Live Birth (incl. Out-of-Town / BRAP)', 'complex', 800.00,
 '3 hours; plus a 10-calendar-day posting period (free of the service fee under BRAP)',
 ARRAY[
   'Submit the request; CCRO verifies entries and document completeness, then prepares the record for filing and posting.',
   'Pay the applicable fee (free under BRAP; P500 for a marital child; P800 for a non-marital child) and receive an Official Receipt with a claim stub showing the release date.',
   'Claim the registered Certificate of Live Birth after the 10-day notice-of-posting period.',
   'Note: applicants aged 80+ or registering an out-of-town birth go through an additional PSA email-based evaluation step before posting; that track carries a flat P500 service fee (free under BRAP).'
 ]),

('LEGITIMATION', 'Legitimation', 'complex', 410.00,
 '3 hours (final PSA endorsement turnaround not separately specified in the charter)',
 ARRAY[
   'Submit the request; CCRO checks correctness and completeness, processes the legal instrument, signs it, and transmits a copy to PSA.',
   'Pay the endorsement fee (P250), mailing fee (P155), and certified-copy fee (P5/page) at the cashier.',
   'Claim the annotated Certificate of Live Birth and attachment.'
 ]),

('DEATH_ONTIME', 'On-Time Registration of Certificate of Death', 'simple', 120.00,
 '1 hour',
 ARRAY[
   'Submit the request; CCRO checks correctness and completeness, assigns a registry number, and signs the Death Certificate.',
   'Pay the burial fee (P30), transfer fee (P60), and issuance fee (P30) at the cashier.',
   'Claim the registered Death Certificate.'
 ]),

('DEATH_DELAYED', 'Delayed Registration of Certificate of Death', 'complex', 620.00,
 '1 hour; plus a 10-calendar-day posting period',
 ARRAY[
   'Submit the request; CCRO checks correctness and completeness and prepares a 10-calendar-day notice of posting.',
   'Pay the burial fee (P30), transfer fee (P60), issuance fee (P30), and service fee (P500) at the cashier.',
   'Claim the late-registered Death Certificate after the 10-day posting period.'
 ]),

('MARRIAGE_LICENSE', 'Application and Issuance of Marriage License', 'complex', 1100.00,
 '3 hours; license released after a 10-day posting period',
 ARRAY[
   'Submit the request; CCRO interviews the couple, prepares Parental Advice/Consent if applicable, and schedules the family planning/marriage counselling session.',
   'Attend the counselling session, pay the family planning fee (P100), application fee (P300), license fee (P200), and a solemnization fee (not itemized in the charter, but implied at roughly P500 based on the stated Total of P1,100), then receive a claim stub as the Notice of Publication is posted/mailed for 10 days.',
   'Claim the Marriage License after the 10-day notice period.'
 ]),

('MARRIAGE_ONTIME', 'On-Time Registration of Marriage Certificate', 'simple', 0.00,
 '1 hour',
 ARRAY[
   'Submit the duly accomplished Marriage Certificate; CCRO checks correctness and completeness, assigns a registry number, and signs.',
   'Claim the registered Certificate of Marriage. No fee for on-time registration.'
 ]),

('MARRIAGE_DELAYED', 'Delayed Registration of Marriage Certificate (incl. Reconstruction)', 'complex', 500.00,
 '1 hour; plus a 10-day posting period',
 ARRAY[
   'Submit the request; CCRO checks correctness and completeness, prepares the Certificate of Marriage, and posts the notice of publication for 10 days.',
   'Pay the P500 service fee at the cashier and receive a claim stub.',
   'Claim the Marriage Certificate after the 10-day posting period.'
 ]),

('CTC_ISSUANCE', 'Issuance of Certified True/Xerox Copies of Civil Registry Records', 'simple', 200.00,
 '1 hour',
 ARRAY[
   'Submit the Verification Form and valid ID; CCRO verifies and signs the requested record.',
   'Pay the applicable fee (P100 for a local request; P200 if the request originates abroad) at the cashier.',
   'Claim the requested certified true/Xerox copy.'
 ]),

('ELEC_ENDORSEMENT', 'Electronic Endorsement', 'simple', 100.00,
 '1 hour at the LCRO; PSA SECPA copy follows about 4 weeks later',
 ARRAY[
   'Submit the applicable transmittal letter and supporting documents (advance endorsement, negative-to-PSA, or blurred/illegible-entry track); CCRO verifies the record and signs/transmits the endorsement letter to PSA.',
   'Pay the electronic endorsement fee (P100) and any per-page certified-copy fee (P5/page) at the cashier.',
   'Claim the PSA SECPA copy, released roughly a month after PSA receives the endorsement.'
 ]),

('RA9048_10172', 'Processing of Petitions under R.A. 9048 and R.A. 10172 (Change of First Name / Correction of Clerical Error)', 'complex', 3200.00,
 '2 hours initial filing; publication runs 2 consecutive weeks; PSA affirmation takes roughly 2-5 months',
 ARRAY[
   'Submit the petition with complete supporting documents; CCRO interviews the petitioner, evaluates the petition, and posts it at the City Hall bulletin board.',
   'Pay the filing fee (P3,200 for change of first name or sex/date-of-birth correction; P1,200 for other clerical-error correction; indigent petitioners are exempt) plus the P300 PSA endorsement fee and any per-page authentication fee.',
   'Have the petition published once a week for 2 consecutive weeks and submit the clippings and publisher''s affidavit; CCRO forwards the petition to PSA Legal Service for affirmation.',
   'Receive the affirmed petition, Certificate of Finality, and the annotated/corrected civil registry record (P150 certified-copy fee plus P5/page authentication fee).'
 ]),

('RA9255_SURNAME', 'Processing of Application for Change of Surname under R.A. 9255', 'complex', 455.00,
 '2 hours',
 ARRAY[
   'Submit the petition with complete supporting documents; CCRO evaluates completeness and the claimed filiation, then prepares the Certificate of Registration and annotated birth certificate.',
   'Pay the authentication fee (P200), paternity fee (P100, if applicable), mailing fee (P155), and any per-page certified-copy fee at the cashier.',
   'Claim the child''s annotated Certificate of Live Birth; CCRO endorses a copy to PSA for database updating.'
 ]),

('COURT_DECREE', 'Registration of Court Decrees/Orders (Adoption, Nullity of Marriage, Legal Separation)', 'complex', 700.00,
 '2 hours',
 ARRAY[
   'Submit the Court Decision/Order with the Certificate of Finality or Entry of Judgment; CCRO examines the decree and registers it in the Registry Book of Court Decrees.',
   'Pay the registration fee (P500 for a foreign decree or adoption; P700 for an annulment or declaration of nullity) plus any per-page certified-copy fee.',
   'Claim the annotated civil registry document; CCRO endorses a copy to PSA for database updating.'
 ]),

('SUPPLEMENTAL_REPORT', 'Supplemental Report', 'complex', 200.00,
 '2 hours',
 ARRAY[
   'Submit the supporting document and a sworn Affidavit of Supplemental Report explaining the omitted entry, with personal appearance.',
   'Pay the P200 fee at the cashier.',
   'Claim the supplemented copy; CCRO endorses the update to PSA.'
 ]),

('OTHER_CERT', 'Issuance of Other Certificates Relative to Civil Registration', 'simple', 100.00,
 '1 hour',
 ARRAY[
   'Submit the Application/Verification Form; CCRO searches the record and prepares and signs the certification.',
   'Pay the P100 fee at the cashier.',
   'Claim the certification.'
 ]),

('EMAIL_INQUIRY', 'Email Assisted-Online Inquiry/Verification for Birth, Death and Marriage Certificates', 'simple', 0.00,
 '2 hours',
 ARRAY[
   'Send an email request with complete details (full name, and date/place of birth, marriage, or death); CCRO receives and verifies the inquiry.',
   'Receive the verification response by email. No fee for this service.'
 ])

on conflict (service_code) do nothing;
-- services_registry has service_code as its primary key, so this makes the
-- insert safe to re-run without throwing a duplicate-key error.


-- ============================================================
-- 2. Service Requirements Metadata
-- ============================================================
--
-- This table has NO unique constraint on (service_code, requirement_name) --
-- only a uuid primary key on `id`. ON CONFLICT can't target a constraint
-- that doesn't exist, so re-running a plain INSERT here would silently
-- duplicate every requirement row instead of erroring. Clear out any
-- existing rows for these 16 services first so this stays safe to re-run.

delete from public.service_requirements_metadata
where service_code in (
  'BIRTH_ONTIME','BIRTH_DELAYED','LEGITIMATION','DEATH_ONTIME','DEATH_DELAYED',
  'MARRIAGE_LICENSE','MARRIAGE_ONTIME','MARRIAGE_DELAYED','CTC_ISSUANCE',
  'ELEC_ENDORSEMENT','RA9048_10172','RA9255_SURNAME','COURT_DECREE',
  'SUPPLEMENTAL_REPORT','OTHER_CERT','EMAIL_INQUIRY'
);

insert into public.service_requirements_metadata
  (service_code, requirement_name, is_mandatory)
values

-- 1. BIRTH_ONTIME
('BIRTH_ONTIME', 'Duly Accomplished Certificate of Live Birth (4 copies) — secure from the hospital, lying-in, or birthing facility', true),
('BIRTH_ONTIME', 'Marriage Contract of parents, 1 certified copy — for a marital child; secure from PSA or the Local Civil Registrar', false),
('BIRTH_ONTIME', 'AUSF (Affidavit to Use the Surname of the Father) & Admission of Paternity, original copy — for a non-marital child; secure from the Local Civil Registrar', false),
('BIRTH_ONTIME', 'Birth Certificate of parents — for a non-marital child; secure from PSA or the Local Civil Registrar', false),
('BIRTH_ONTIME', 'Information Sheet, original copy — secure from the hospital or lying-in', true),
('BIRTH_ONTIME', 'Valid ID, 1 photocopy with signature', true),

-- 2. BIRTH_DELAYED
('BIRTH_DELAYED', '4 copies of duly accomplished Certificate of Live Birth — secure from hospital, lying-in, birthing facility, or Local Civil Registrar', true),
('BIRTH_DELAYED', 'PSA Negative Certification, 1 original + 1 photocopy — secure from PSA', true),
('BIRTH_DELAYED', '2 documentary evidences (e.g. baptismal certificate, school records, voter''s registration, medical records, Pag-IBIG/PhilHealth/SSS records, NBI/police clearance), certified photocopies', true),
('BIRTH_DELAYED', 'Affidavit of 2 Disinterested Persons / Joint Affidavit, with photocopy of affiants'' IDs — secure from the Local Civil Registrar', true),
('BIRTH_DELAYED', 'For a marital child: Marriage Certificate of parents, 1 photocopy', false),
('BIRTH_DELAYED', 'For a non-marital child: Acknowledgement/Admission of Paternity, AUSF, and Sworn Attestation of mother/guardian (for child 7-17 yrs old), with photocopies of parents'' and child''s IDs', false),
('BIRTH_DELAYED', 'National ID / PhilSys Transaction Slip, 1 photocopy — secure from PSA', true),
('BIRTH_DELAYED', 'Barangay Residency certificate, original or certified photocopy — secure from the Punong Barangay', true),
('BIRTH_DELAYED', '2x2 ID picture, white background', true),
('BIRTH_DELAYED', 'Valid ID of registrant/informant, with personal appearance', true),
('BIRTH_DELAYED', 'Parent''s valid ID / birth certificate / death certificate (if deceased), 1 original to present + 1 certified photocopy', true),
('BIRTH_DELAYED', 'For a foreign parent: valid passport / BI Clearance / ACR-I Card, 1 original to present + 1 certified photocopy — secure from the Philippine Embassy or DFA', false),
('BIRTH_DELAYED', 'If under BRAP: Negative Omnibus Certification, 1 original + 1 photocopy — secure from PSA', false),
('BIRTH_DELAYED', 'If under BRAP: Affidavit of 2 Disinterested Persons, with photocopies of affiants'' IDs', false),
('BIRTH_DELAYED', 'If under BRAP: Certificate of Indigency, 1 original — secure from the Punong Barangay', false),
('BIRTH_DELAYED', 'Any other proof of identity (e.g. barangay certification, driver''s license), 1 photocopy, if applicable', false),

-- 3. LEGITIMATION
('LEGITIMATION', 'Birth Certificate, original + 2 certified xerox copies — secure from the Local Civil Registrar or PSA', true),
('LEGITIMATION', 'Marriage Contract of parents, 1 certified photocopy — secure from the Local Civil Registrar or PSA', true),
('LEGITIMATION', 'CENOMAR of mother and father (PSA), 3 xerox copies each', true),
('LEGITIMATION', 'Valid ID or Community Tax Certificate, 1 photocopy with signature', true),
('LEGITIMATION', 'Affidavit of Legitimation, notarized, original copy', true),
('LEGITIMATION', 'Admission of Paternity, for a child declared with unknown father on the COLB, original copy', false),
('LEGITIMATION', 'Mandatory personal appearance of the couple', true),

-- 4. DEATH_ONTIME
('DEATH_ONTIME', 'Duly Accomplished Death Certificate reviewed by the City Health Office, 4 original copies', true),
('DEATH_ONTIME', 'Burial Permit Fee / Transfer Permit Fee, 1 original copy — secure from the City Treasurer''s Office', true),
('DEATH_ONTIME', 'Certification of Not Embalmed, 1 original copy — if not embalmed; secure from the funeral parlor or informant', false),
('DEATH_ONTIME', 'Certificate of Cremation, 1 original copy — if cremated; secure from the funeral parlor', false),

-- 5. DEATH_DELAYED
('DEATH_DELAYED', 'Duly Accomplished Death Certificate reviewed by City Health Office, notarized, 4 original copies', true),
('DEATH_DELAYED', 'Burial Permit Fee / Transfer Permit Fee, 1 original copy — secure from the City Treasurer''s Office', true),
('DEATH_DELAYED', 'Certification of Not Embalmed, 1 original copy — if not embalmed', false),
('DEATH_DELAYED', 'Certificate of Cremation, 1 original copy — if cremated; secure from the funeral parlor/crematorium', false),
('DEATH_DELAYED', 'Burial Certificate, 1 original copy — secure from the cemetery or church where the deceased was buried', true),
('DEATH_DELAYED', 'PSA Negative Result, 1 original copy', true),

-- 6. MARRIAGE_LICENSE
('MARRIAGE_LICENSE', 'Birth certificate, 1 certified photocopy', true),
('MARRIAGE_LICENSE', 'CENOMAR, 1 original — secure from PSA', true),
('MARRIAGE_LICENSE', 'Valid ID, 1 photocopy with signature', true),
('MARRIAGE_LICENSE', 'Parental Advice, for applicants 21-24 years old, 1 original + 1 photocopy of parent''s ID', false),
('MARRIAGE_LICENSE', 'Consent, for applicants 18-20 years old, 1 original + 1 photocopy of parent''s ID', false),
('MARRIAGE_LICENSE', 'Death Certificate of spouse, for a widow/widower, 1 certified photocopy', false),
('MARRIAGE_LICENSE', 'Legal Capacity to Marry, for a foreign-national applicant, 1 original — secure from the respective embassy', false),
('MARRIAGE_LICENSE', 'Original/Certified True Copy of Judicial Decree of Absolute Divorce or Nullity of Marriage, for an annulled/divorced applicant, 1 certified photocopy — secure from the court', false),
('MARRIAGE_LICENSE', 'Mandatory personal appearance of both applicants', true),

-- 7. MARRIAGE_ONTIME
('MARRIAGE_ONTIME', 'Duly Accomplished Marriage Certificate, 4 copies', true),
('MARRIAGE_ONTIME', 'Affidavit of Cohabitation — for Article 34 marriages', false),
('MARRIAGE_ONTIME', 'Dowry Agreement Form / Marital Settlement Agreement / Prenuptial Agreement, if applicable', false),

-- 8. MARRIAGE_DELAYED
('MARRIAGE_DELAYED', 'Duly Accomplished Marriage Certificate / Affidavit of Delayed Registration, 4 copies — secure from the church, mayor''s office, or RTC', true),
('MARRIAGE_DELAYED', 'Negative Result of Marriage, 1 original — secure from PSA', true),
('MARRIAGE_DELAYED', 'For reconstruction: CENOMAR, 1 original — secure from PSA', false),
('MARRIAGE_DELAYED', 'For reconstruction: Certificate of Marriage/Matrimony, 1 original — secure from the church, mayor''s office, or RTC', false),
('MARRIAGE_DELAYED', 'Birth certificates of children showing the correct date of marriage, 2 certified photocopies', false),
('MARRIAGE_DELAYED', 'Affidavit of 2 Disinterested Persons, 1 original — secure from a notary public or the Civil Registrar', true),

-- 9. CTC_ISSUANCE
('CTC_ISSUANCE', 'Verification Form, properly filled up and signed by the requesting party', true),
('CTC_ISSUANCE', 'Valid ID, 1 photocopy with picture and signature', true),
('CTC_ISSUANCE', 'Authorization Letter of the document owner / Affidavit of Kinship — required if the requester is not the document owner', false),

-- 10. ELEC_ENDORSEMENT
('ELEC_ENDORSEMENT', '[Advance Endorsement] Transmittal Letter, 3 copies', true),
('ELEC_ENDORSEMENT', '[Advance Endorsement] OCRG copy of Municipal Form 102/103/97', true),
('ELEC_ENDORSEMENT', '[Advance Endorsement] Client''s Proof of Urgency', true),
('ELEC_ENDORSEMENT', '[Advance Endorsement] Letter Request, 3 copies', true),
('ELEC_ENDORSEMENT', '[Advance Endorsement] Valid ID', true),
('ELEC_ENDORSEMENT', '[Negative to PSA CRS] PSA Negative Certification', false),
('ELEC_ENDORSEMENT', '[Negative to PSA CRS] Transmittal Letter, 3 copies', false),
('ELEC_ENDORSEMENT', '[Negative to PSA CRS] Form 1A/2A/3A, 1 copy', false),
('ELEC_ENDORSEMENT', '[Negative to PSA CRS] Certified copy of Registry Book, 1 copy', false),
('ELEC_ENDORSEMENT', '[Negative to PSA CRS] Certified copy of Municipal Form 102/103/97, 1 copy', false),
('ELEC_ENDORSEMENT', '[Negative to PSA CRS] Letter Request, 3 copies', false),
('ELEC_ENDORSEMENT', '[Negative to PSA CRS] Valid ID', false),
('ELEC_ENDORSEMENT', '[Blurred/Illegible Entries] Blurred PSA-SECPA copy', false),
('ELEC_ENDORSEMENT', '[Blurred/Illegible Entries] Transmittal Letter, 3 copies', false),
('ELEC_ENDORSEMENT', '[Blurred/Illegible Entries] Form 1A/2A/3A, 1 copy', false),
('ELEC_ENDORSEMENT', '[Blurred/Illegible Entries] Certified copy of Registry Book, 1 copy', false),
('ELEC_ENDORSEMENT', '[Blurred/Illegible Entries] Municipal Form 102/103/97, 1 copy', false),
('ELEC_ENDORSEMENT', '[Blurred/Illegible Entries] Letter Request, 3 copies', false),
('ELEC_ENDORSEMENT', '[Blurred/Illegible Entries] Valid ID', false),

-- 11. RA9048_10172 — all conditional: which set applies depends on the petition type filed
('RA9048_10172', '[Change of First Name] Child''s Certificate of Live Birth, 2 certified photocopies', false),
('RA9048_10172', '[Change of First Name] NBI and Police Clearance stating the purpose as Change in First Name, 2 original copies', false),
('RA9048_10172', '[Change of First Name] Employer''s Certification of No Pending Administrative Case (if employed), 2 original copies', false),
('RA9048_10172', '[Change of First Name] Affidavit of Non-Employment/Self-Employment, if applicable, 2 original copies', false),
('RA9048_10172', '[Change of First Name] Newspaper clippings & Publisher''s Affidavit of Publication, 2 original copies', false),
('RA9048_10172', '[Change of First Name] At least 3 supporting documents (e.g. baptismal certificate, school records, driver''s license, marriage certificate, BIR/SSS/Pag-IBIG record, passbook), originals or certified photocopies', false),
('RA9048_10172', '[Correction of Clerical Error] Civil registry document with the erroneous entry, 2 PSA copies or certified photocopies', false),
('RA9048_10172', '[Correction of Clerical Error] Petitioner''s parents'' and siblings'' Certificates of Live Birth, 2 certified photocopies', false),
('RA9048_10172', '[Correction of Clerical Error] Petitioner''s Marriage Certificate (if married) and children''s birth certificates, 2 certified photocopies', false),
('RA9048_10172', '[Correction of Clerical Error] Personal documents bearing the correct entry (e.g. baptismal certificate, school records, government IDs), 2 certified photocopies', false),
('RA9048_10172', '[RA 10172 Sex/DOB Correction] Certified true copy of the certificate or registry-book page containing the entry to be corrected', false),
('RA9048_10172', '[RA 10172 Sex/DOB Correction] Earliest school record, or an affidavit that the petitioner never attended school', false),
('RA9048_10172', '[RA 10172 Sex/DOB Correction] Medical record or baptismal certificate', false),
('RA9048_10172', '[RA 10172 Sex/DOB Correction] Baptismal certificate, or an affidavit plus other documents from religious authorities if none exists', false),
('RA9048_10172', '[RA 10172 Sex/DOB Correction] Clearance/certification of no pending case from employer, NBI, and PNP', false),
('RA9048_10172', '[RA 10172 Sex/DOB Correction] Affidavit of Publication and newspaper clipping, published weekly for 2 consecutive weeks', false),
('RA9048_10172', '[RA 10172 Sex/DOB Correction] Notice and Certificate of Posting', false),
('RA9048_10172', '[RA 10172 Sex/DOB Correction] Certification from the City/Municipal Health Officer that the petitioner has not undergone sex change or transplant', false),
('RA9048_10172', 'Additional supporting documents as the petitioner or Local Civil Registrar may deem relevant', false),

-- 12. RA9255_SURNAME
('RA9255_SURNAME', 'Certified Xerox copy of the child''s LCRO and PSA birth certificate, 1 copy', true),
('RA9255_SURNAME', 'Subscribed Affidavit to Use the Surname of the Father, 3 original copies, with personal appearance (mother/legal guardian for ages 0-7; child with notarized attestation of mother/guardian for ages 7-17; child directly for ages 18+)', true),
('RA9255_SURNAME', 'Notarized Father''s Admission of Paternity, for a child not recognized by the father on the birth certificate, 3 original copies', false),

-- 13. COURT_DECREE
('COURT_DECREE', 'Certified Xerox copies of the Court Decision, 4 original copies', true),
('COURT_DECREE', 'Certified Xerox copy of the Certificate of Finality / Entry of Judgment / Decree of Adoption or Nullity of Marriage, 4 original copies', true),
('COURT_DECREE', 'Certificate of Registration and Authenticity of the Court Decision — required only if the decision was not issued by the RTC of Legazpi City; secure from the Local Civil Registrar where the issuing court is located', false),

-- 14. SUPPLEMENTAL_REPORT
('SUPPLEMENTAL_REPORT', 'Certified copy of the LCRO and PSA birth, death, or marriage certificate, 1 original + 1 certified photocopy', true),
('SUPPLEMENTAL_REPORT', 'Subscribed Affidavit of Supplemental Report stating the reason the entry was omitted, with personal appearance, 2 original copies', true),
('SUPPLEMENTAL_REPORT', 'Any document bearing the correct information to be supplemented, 1 original copy', true),

-- 15. OTHER_CERT
('OTHER_CERT', 'Application/Verification Form, 1 original copy', true),
('OTHER_CERT', 'Letter-request, 1 original copy', true),

-- 16. EMAIL_INQUIRY
('EMAIL_INQUIRY', 'Email Request Letter with complete information', true),
('EMAIL_INQUIRY', 'Verification Form', true),
('EMAIL_INQUIRY', 'Authorization Letter — required if the requester is not the owner of the document', false),
('EMAIL_INQUIRY', 'Valid ID', true);