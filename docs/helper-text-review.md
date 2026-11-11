# Helper text outside application fields

Snapshot: 11 November 2026. Narrowed from the earlier live-template and source inventory.

Only section introductions, standalone notices, and page instructions are included. Helper text attached to individual fields, questions, options, upload controls, or the signature control is excluded. Conditional notices embedded under individual fields are also excluded; standalone age and registration-window notices remain.

Decisions applied: removed redundant introductions and repeated selection guidance; retained instructions needed to complete the request. IDs are preserved from the earlier list, so gaps are intentional. Template versions below identify the inventory snapshot; the display changes were made in the application source.

This covers applicant application screens, not staff/admin or request-detail screens. Text reflects the earlier current-template/source inspection; no browser walkthrough was performed.


## Delayed Registration of Certificate of Live Birth

Template: `birth_delayed`, active version 17. Services: `DCOLB-0079-BRAP`, `DCOLB-0079-NORMAL-MARITAL`, `DCOLB-0079-NORMAL-NONMARITAL`, `DCOLB-80UP-BRAP`, `DCOLB-80UP-NORMAL-MARITAL`, `DCOLB-80UP-NORMAL-NONMARITAL`.

| ID | Section / notice | Current text | Shows when / context | Decision |
| --- | --- | --- | --- | --- |
| H004 | This date is within the last 30 days | Use the registration type that matches the birth date. | Date outside the selected service's registration window (inside_window); redirect_confirm | Remove |
| H005 | Find the right delayed-registration service | Your answers help us select the correct service, fee, process, and requirements. | Service selection | Remove |


## On-Time Registration of Certificate of Live Birth

Template: `birth_ontime`, active version 11. Services: `OTCOLB-MARITAL`, `OTCOLB-NONMARITAL`.

| ID | Section / notice | Current text | Shows when / context | Decision |
| --- | --- | --- | --- | --- |
| H007 | This date is more than 30 days ago | Use the registration type that matches the birth date. | Date outside the selected service's registration window (outside_window); redirect_confirm | Remove |
| H008 | Find the right on-time registration service | Select the child’s case so we can apply the correct fee, parties, and requirements. | Service selection | Remove |


## Issuance of Certified True/Xerox Copies of Civil Registry Records

Template: `ctc_issuance`, active version 40. Services: `CTC-ABROAD`, `CTC-LOCAL`.

| ID | Section / notice | Current text | Shows when / context | Decision |
| --- | --- | --- | --- | --- |
| H011 | Where is this request coming from? | The fee depends on whether the request originates in the Philippines or abroad. | Service selection | Remove |


## Delayed Registration of Certificate of Death

Template: `death_delayed`, active version 9. Services: `DEATH_DELAYED`.

| ID | Section / notice | Current text | Shows when / context | Decision |
| --- | --- | --- | --- | --- |
| H015 | This date is within the last 30 days | Use the registration track that matches the death date. | Date outside the selected service's registration window (inside_window); redirect_confirm | Remove |


## On-Time Registration of Certificate of Death

Template: `death_ontime`, active version 13. Services: `DEATH_ONTIME`.

| ID | Section / notice | Current text | Shows when / context | Decision |
| --- | --- | --- | --- | --- |
| H018 | This date is more than 30 days ago | Use the registration track that matches the death date. | Date outside the selected service's registration window (outside_window); redirect_confirm | Remove |


## Delayed Registration of Marriage Certificate (incl. Reconstruction)

Template: `marriage_delayed`, active version 9. Services: `MARRIAGE_DELAYED`.

| ID | Section / notice | Current text | Shows when / context | Decision |
| --- | --- | --- | --- | --- |
| H033 | This marriage is still within the on-time registration period | With a marriage license, the on-time period is 15 days. Under Article 34 or P.D. 1083, it is 30 days. Use On-Time Registration while the marriage is within its applicable period. | Date outside the selected service's registration window (inside_window); redirect_confirm | Remove |


## Application and Issuance of Marriage License

Template: `marriage_license`, active version 10. Services: `MARRIAGE_LICENSE`.

| ID | Section / notice | Current text | Shows when / context | Decision |
| --- | --- | --- | --- | --- |
| N003 | Applicant is under 18 | This case does not fit the configured Marriage License workflow. Correct the birth date or contact the CCRO for guidance. | Selected option / age band: Under 18 years old; Blocks progress | Remove explanatory text; keep blocking title |
| N004 | Parental consent requirements apply | The checklist will include the documents configured for applicants aged 18–20. | Selected option / age band: 18–20 years old; Does not block progress | Remove |
| N005 | Parental advice requirements apply | The checklist will include the documents configured for applicants aged 21–24. | Selected option / age band: 21–24 years old; Does not block progress | Remove |
| N006 | Applicant is under 18 | This case does not fit the configured Marriage License workflow. Correct the birth date or contact the CCRO for guidance. | Selected option / age band: Under 18 years old; Blocks progress | Remove explanatory text; keep blocking title |
| N007 | Parental consent requirements apply | The checklist will include the documents configured for applicants aged 18–20. | Selected option / age band: 18–20 years old; Does not block progress | Remove |
| N008 | Parental advice requirements apply | The checklist will include the documents configured for applicants aged 21–24. | Selected option / age band: 21–24 years old; Does not block progress | Remove |


## On-Time Registration of Marriage Certificate

Template: `marriage_ontime`, active version 8. Services: `MARRIAGE_ONTIME`.

| ID | Section / notice | Current text | Shows when / context | Decision |
| --- | --- | --- | --- | --- |
| H035 | This date is outside the on-time window | A marriage with a license is registered on time within 15 days; one without a license (Article 34 or P.D. 1083) within 30 days. Use the registration track that matches the marriage date. | Date outside the selected service's registration window (outside_window); redirect_confirm | Remove |


## Processing of Petitions under R.A. 9048 and R.A. 10172

Template: `ra9048_10172`, active version 4. Services: `RA9048-CCE`, `RA9048-CFN`.

| ID | Section / notice | Current text | Shows when / context | Decision |
| --- | --- | --- | --- | --- |
| H049 | What does your petition cover? | Answer each question; at least one must be Yes. Online submission is for staff review. Staff must verify all applicable requirements before accepting the petition. Publication documents are submitted later, as described in the service steps. | Service selection | Remove |


## Shared application instructions

These come from the application source, rather than the live template JSON. Several appear across multiple services.

| ID | Location | Current text | Shows when / source | Decision |
| --- | --- | --- | --- | --- |
| S001 | Service selection | Your answers help us select the right service. | Fallback when a service selector has no custom description; CaseSelector.tsx | Remove |
| S002 | Service selection | Service selected: {service name} | After the answers select a service; CaseSelector.tsx | Remove visually; keep screen-reader announcement |
| S003 | Service summary | Answer the questions below to identify the exact service. | Before a specific service is selected; ApplicationDocket.tsx | Remove |
| S004 | Court decrees | Online applications cover foreign decrees or adoption and annulment or declaration of nullity of marriage. Legal separation is listed in the Citizen's Charter but is not available as an online option. For legal separation, visit CCRO for guidance. | Court annulment and foreign decree/adoption options; CaseStep.tsx | Remove |
| S005 | Death registration | Enter the date and place of death exactly as shown on the completed Certificate of Death. | On-time/delayed death case fields; CaseStep.tsx | Remove |
| S006 | Requester/owner details | Tell us who is making this request, then who the record is for. | Details screens with a separate owner section; DetailsStep.tsx | Remove |
| S007 | Two-party details | Enter each party's full name exactly as it should appear on the civil registry record. | Details screens showing party labels; DetailsStep.tsx | Remove |
| S008 | Single-person details | Enter the full name of the person named on the civil registry record, exactly as it should appear. | Other details screens; DetailsStep.tsx | Remove |
| S009 | Account requester | You are the requester for this online application. Your name comes from your account profile and cannot be changed here. Another requester must use their own account or apply in person. | CTC, Email Inquiry, Electronic Endorsement requester names; DetailsStep.tsx | Remove |
| S011 | Deferred date check | We'll check the date against your supporting document before processing your request. | Appended to a date notice when its template requires document review first; CaseStep.tsx | Remove |
| S012 | Upload step | Take photos one at a time, or choose or drag in several JPG, PNG, or PDF files, up to 10 MB each. | Upload screen introduction; DocumentsStep.tsx | Keep |
| S018 | Upload checklist empty | No specific required documents are listed for this service — you can continue. | No mandatory requirements listed; DocumentsStep.tsx | Keep |
| S019 | In-person requirements | Complete at the CCRO - no upload needed | Requirements not requiring uploads; DocumentsStep.tsx | Keep |
| S020 | Prepared verification form | Prepared for you - no upload needed | Email Inquiry branch; DocumentsStep.tsx | Keep |
| S021 | Online verification signature | Sign online - no upload needed | Online verification signature branch; DocumentsStep.tsx | Keep |
| S022 | Online verification form | Verification Form: sign online in the next step. No printing needed. | Verification form in the no-upload list; DocumentsStep.tsx | Keep |
| S024 | After submission | CCRO staff will pre-check your documents. You'll be notified in-system and by email as your request moves forward. | Submission success screen; ReviewStep.tsx | Keep |
| S025 | Review: next steps | Staff check your uploads online. If one needs fixing, you upload it again here. | Default next-steps card; ReviewStep.tsx | Keep |
| S026 | Review: next steps | When it is ready for release, visit the CCRO once with your original documents. | Default next-steps card; ReviewStep.tsx. Existing wording included for review; its accuracy across service-specific personal-appearance steps was not assessed here. | Keep |
| S027 | Review: next steps | Show your tracking number, pay any fee, and claim it. | Default next-steps card; ReviewStep.tsx | Keep |
| S028 | Review: on-time services | Keep your tracking number for your visit to the CCRO. | On-time registration next-steps card; ReviewStep.tsx | Keep |
| S029 | On-time deadline | Visit CCRO for final validation | Fallback heading; on-time-registration.ts | Keep |
| S030 | On-time deadline | Visit CCRO by {date} - {number} days left / due today | Calculated deadline heading; on-time-registration.ts | Keep |
| S031 | On-time deadline passed | Deadline: {date} - deadline has passed | Deadline heading after expiry; on-time-registration.ts | Keep |
| S032 | On-time documents | Bring your hard copies for final validation. | On-time registration notice; on-time-registration.ts | Keep |
| S033 | On-time birth/death period | {Birth/Death} registration is due within 30 days from the date of {birth/death}. Late submission requires delayed registration. | On-time birth/death review guidance; on-time-registration.ts | Keep |
| S034 | On-time marriage period | Marriage registration is due within {15/30} days from the date of marriage. Late submission requires delayed registration. | 15 days with license; 30 days for selected Article 34/P.D.1083. Without a selected basis: '15 days from the date of marriage with a license, or 30 days for a license-exempt marriage'; on-time-registration.ts | Keep |
| S035 | On-time deadline passed | Your request will automatically switch to delayed registration. Check My Requests for the updated requirements. | Expired deadline notice; on-time-registration.ts | Keep |
| S036 | Death reporting | Report the death to the Local Health Officer within 48 hours. | On-time death notice; on-time-registration.ts | Keep |


## Review notes

- H items are section introductions or standalone registration-window explanations. N items are standalone age notices. S items are shared screen instructions.
- Marriage License N003-N005 apply to the Bride; N006-N008 apply to the Groom. Each age notice includes the calculated age before its body text.
- Date-window text can also appear in the switch-service confirmation dialog.
- Shared items are listed once even when several services display them.
- Services with no remaining text outside fields are omitted from this narrowed list.
- Removing visible wording does not remove the underlying validation, routing, or document requirements.
- Sources: active Supabase form versions and bindings from the previous inventory; CaseStep.tsx, DetailsStep.tsx, CaseSelector.tsx, ApplicationDocket.tsx, DocumentsStep.tsx, ReviewStep.tsx, DerivedAnswerAlerts.tsx, and on-time-registration.ts.
