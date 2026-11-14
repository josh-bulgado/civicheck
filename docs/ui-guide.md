# Civicheck UI guide

On-time and delayed marriage registration retain the required husband/wife role
question. Both spouses' names are entered manually, including the wife's maiden
name; neither the form nor submission replaces them with the account name.
Keep one divider between the role question and Husband's Name.
Date and place of marriage appear on page 2 after both spouses' names and before
contact number. Keep event_date/event_place and the existing timing rules,
including license-based windows, reconstruction exemption, and track switching.
Separate these record fields from the spouse names with a divider. On desktop,
the date takes one-third of the row and place takes two-thirds; contact is below.
Stack the fields on mobile.
Marriage registration walk-ins use the same husband-first order, divider before
the marriage date/place, wider place field, and contact row below. Names remain
manual. Omit the on-time license-basis help text and retain timing checks.

Delayed-birth applicant and walk-in forms replace the optional informant name
and relationship inputs with requester relationship or role. Relationship is
required online and optional for birth walk-ins. Include I am the person being
registered and Informant (person reporting the birth), and require a description for
Other. This intake field does not establish that the requester is the informant
on the official birth document. In both birth forms, show the birth date beside
suffix and sex, then show place of birth at full width below the child's inputs.

The staff dashboard's parent loading fallback uses `StaffDashboardFrameSkeleton`
on `/staff-dashboard` and for known staff on `/dashboard`. Keep its sidebar width,
header height, and content padding aligned with the dashboard layout. The child
route uses `StaffDashboardSkeleton` inside the existing frame.
After password sign-in to the default staff destination or a dashboard return URL,
preload `/staff-dashboard` before navigating so the sign-in form stays visible
while the data loads.
During this staff sign-in transition, disable the router's pending-screen timer
until navigation finishes, then restore its normal timing even on failure.
The staff dashboard inherits that timing so skipped preloads cannot flash its
skeleton on a first browser visit.

Supplemental Report asks Which certificate needs additional information? on the
case page. Use Document Owner's Information for the person-information heading
for birth, death, and marriage records, including staff walk-in intake. Its event
date and place appear on the details page directly below
the person's suffix and sex, before the mother's information. For birth and death records,
reuse on-time birth's layout: date beside suffix/sex and full-width place below.
Labels follow the selected birth,
death, or marriage certificate. Keep the event_date/event_place keys for saved answers.
For Supplemental Report birth records, seed a blank person's name from the
account once and keep it editable. Show a divider after the mother's information,
then an optional Father's Full Name field for birth records, including walk-ins.
Preserve entered names. Keep only the page
header divider above the first name group; avoid a second divider on that group.
Supplemental Report marriage records collect Husband's Name and the shared split
Wife's Maiden Name before marriage date/place. Both names are entered manually;
do not autofill them from the account. Reuse these fields in staff walk-ins.
Omit Document Owner's Information for this marriage option; keep the husband
and wife's headings only.

Across service forms and walk-ins, field labels longer than four words use
sentence case, preserving acronyms such as PSA, NBI, and PNP. Shorter labels keep
their existing formatting. Petition details uses the same 24px heading-to-field
gap as Petition type.

Date-of-birth questions across all online services and staff walk-ins use the
calendar `DatePicker`, including record-dependent birth dates, bride/groom birth
dates, and proposed corrected birth dates. Do not use Month, Day, Year dropdowns.
Keep existing date limits, timing callbacks, age calculations, drafts, and
submission values in `YYYY-MM-DD` format.

Online petition intake uses one primary-petition radio group. Its fields and
checklist follow that primary choice. Put required petition fields before
optional fields. The birth-date option reads Day or month of birth. Review shows
Petition Type first, once, instead of the four legacy yes/no questions.
Its review sections use Petition details and Person and record details.
Use Charter item 11, PDF pages 16-19, as the service-policy
source. Do not collect relationship/representative authority, first-name legal
grounds, registration-location eligibility, additional correction concerns,
or extra contact/notes. Keep basic record identification, current/proposed
entries, employment alternatives, and the documented indigency question.
On the petition case page, Petition details uses the shared section-heading size. Omit the help text under corrected birth date, recorded event date,
filing-fee exemption, registry number, and employment status.
Petition record date and place appear on the next page after the person's name,
using the existing event_date/event_place keys once. The proposed corrected
birth date stays in Petition details on the first page.
First-name petitions collect the current name only through the name group on
page 2. Page 1 asks for the proposed first name. The petition's page-2 name
heading follows primary_petition so stale record-type answers cannot show a
deceased-person heading for a birth-record petition.
Every online service uses Person and Record Details as its second-page title
and Person and record details as its review-block heading. Keep service-specific
headings within the page and keep walk-in titles unchanged. Birth-specific
petitions label the recorded date/place as Date of Birth and Place of Birth,
then reuse CTC's split mother's maiden name and optional Father's Full Name.
Clerical-error petition details follow the chosen record type: marriage uses
Husband's Name, the shared split Wife's Maiden Name, and marriage date/place;
death uses Deceased Person's Name and death date/place. Neither uses account-name
autofill, birth-name help text, or birth-parent fields. Ignore stale record types
when the primary petition is specific to birth records.
The Which entry has the error? example also follows the selected record type.
Across all services, omit bracketed case prefixes from document names in online
uploads, review lists, camera/attachment previews, service checklists, walk-in
requirements, request details, tracking, and acknowledgment PDFs. Reuse
requirementDisplayName or parseRequirementName; keep stored names, copy counts,
source notes, and applicability rules. Conditional badges describe applicability
without repeating the old prefix. This also covers older uploads.
The petition details page keeps record date and place beside each other: date
uses one-third of the row and place uses two-thirds. Both stack on mobile.
Keep these paired controls aligned when one label wraps, including walk-ins.
Birth-record petitions seed a blank owner's name from the account once and keep
it editable. Preserve saved names. Omit the extra owner-name heading and keep
First Name with the help text: Use the first name shown on your birth certificate.
Birth-specific petitions ask Registered late? below Father's Full Name, following
the supplied CCRO reference form's order.
Yes requires the registration date, with the existing estimated year/range option
and checks against the birth date and future dates.
Marriage and death petitions also ask Registered late? after their record date
and place, using the same conditional date and estimate controls. Marriage
husband/wife names remain manual; do not seed them from the account.

Legal staff use petition walk-in intake for R.A. 9048/10172. Choose one petition
type for first-name, sex, or birth-day/month correction. Clerical correction uses
the selected service directly and asks the record type. Retain the matching
record names, dates/place, birth parents, registration timing, and proposed
changes. Current first name is collected once in the person's name group.
Marriage uses manual husband/wife names and does not ask sex separately.
Do not autofill from the staff account, ask online eligibility/indigency questions,
or require uploads. Staff confirm the filing papers
before the request starts Processing. Publication and PSA
affirmation remain later office steps; intake does not mark payment or release
complete. The existing limitation on applying indigency exemptions remains.

Use this guide when creating or changing Civicheck screens. It describes the
existing application, with source files to read before implementing a pattern.
An explicit design request can change these conventions; ordinary feature work
should extend the nearest existing screen. When source code changes, update the
affected guidance rather than treating this snapshot as a second implementation.

## Project foundation

Online and walk-in name headings use Husband's Name, Wife's Maiden Name,
Child's Name, Groom's Name, and Bride's Name. These display labels do not change
the labels in generated Verification Forms.

Birth registration uses its existing Mother person group for the mother's maiden
name; do not add a duplicate name group. Birth-record selections in Electronic
Endorsement, Other Certificates, and Supplemental Report use the same three
mother-name fields as CTC, including No middle name. Detailed walk-ins retain
these fields; death and marriage selections do not show them.

Online forms use heading sizes from `wizard-field.tsx`: page titles 32px,
section headings 24px, and person-name groups and Address 20px. Walk-in section
and name-group headings match the 15px field labels, except surname-change
section headings use 17px bold. Walk-ins use dividers
between sections, name groups, and the physical-document confirmation.
Field labels stay 15px, including the optional Father's Full Name field.
Father's full-name fields allow periods for initials and suffixes such as Jr.
Use the same rule for applicant forms, walk-ins, and submission validation.
Every selected walk-in service has a clickable fee badge. It opens the configured
included and additional charges, or a single service-fee line when no breakdown
is configured. Per-copy services show the unit price, copy count, and total.
Online and walk-in forms separate sections, person-name groups, and Address
with full-width borders in normal layout flow. Keep padding after each border
and a full grid row for name-group headings so controls cannot overlap a divider.
Optional Father's Full Name remains a field without its own divider.
Electronic Endorsement birth records show this optional field after the mother's
name, using the same 15px label as the other fields.
Their birth date and place appear after the owner's details, before the mother's
name.
Electronic Endorsement asks Registered late? for birth, death, and marriage
records. Yes shows the registration date, using the existing date checks and
estimated-date option from Other Certificates.
Its document upload step omits the bracketed endorsement-case prefix from upload
titles, camera titles, and the in-person checklist.
When the record type is selected, its Form 1A/2A/3A requirement displays only
Form 1A for birth, Form 2A for death, or Form 3A for marriage.
Electronic Endorsement walk-ins reuse the active case and owner fields, including
birth parents' names and late-registration questions for all three record types.
Staff confirm the physical papers for the selected endorsement type. Birth and
death records ask for Sex beside Suffix and save the selected value. Marriage
does not ask for Sex. Omit requester/address fields and uploads. The checklist is available in
View requirements. Accepted walk-ins start Processing and unpaid, with the
accepting staff member and physical check recorded. PSA transmission remains a
later office action. Charter item 10, PDF pages 15-16, is the policy reference.
During Processing, the handling staff member records the actual date sent to
PSA. The applicant sees an estimated availability date one calendar month later;
this estimate never advances the request automatically. Before Ready for Release,
staff save the confirmed claiming location and instructions and confirm that the
final PSA certificate is available. These details appear in the applicant tracker,
public tracking, and release notifications, without assuming collection at CCRO.
The date, claiming details, availability confirmation, and actor are audited.

Other Certificates walk-in intake records the selected birth, death, or marriage
record, the person's name, event date and place, optional registry number and
contact number, purpose, and optional notes. Marriage also asks for the maiden
name of wife and labels the main name as the husband. Existing mother and wife
maiden-name questions use First Name, Middle Name with No middle name, and Maiden
Last Name in both online and detailed walk-in forms. Verification PDFs join the
parts and keep support for older requests saved with one wife-maiden-name field.
For Other Certificates birth records, the owner's date and place precede the
mother's name. Optional Father's Full Name follows the mother's name without a
divider, in both the online and walk-in form.
All three records ask
Registered Late? and, when Yes, the registration date, using the CTC fields.
Omit sex and uploads. Staff check
the original Application/Verification Form and agency letter-request before
encoding. Accepted requests start Processing and unpaid, with the accepting
staff member recorded. Charter item 15, PDF pages 22-23, documents the physical
papers and record search; the digital intake fields are system behavior.

Walk-in intake starts with the service selection and fields. Omit generic
introductory instructions; retain field guidance, service-specific notices,
validation messages, and required confirmations.
Before a service is selected, hide the generic name, contact, and purpose inputs.
Walk-in labels, options, and notices use the staff's point of view, naming the
applicant or document owner. The estimated-date checkbox says Exact date unknown.
Keep staff confirmations such as I checked and I verified. Apply this wording
only at display time; online forms, saved answers, and Verification Forms retain
their existing wording.

When a requester is the record owner, name autofill includes the applicable
suffix and preserves names the applicant has edited. Existing separate middle-name
fields offer No middle name. Record-dependent headings and event-place examples
follow the selected birth, death, or marriage record in online and detailed
walk-in forms. Completed-event dates use the Philippine calendar day and are
validated in both the form and submission. Late-registration dates cannot precede
the selected record's event date. Marriage License age brackets continue to use
the intended marriage date; registration age brackets continue to use today's date.
Only requirements asking for two or more physical copies say "Upload only one
(1) copy of each document (all pages)." Single-copy requirements keep ordinary
upload wording. Apply this distinction across services, including delayed birth
and Other Certificates. Keep physical quantities after "Bring to CCRO:" and
preserve original, photocopy, and "each" instructions. Valid IDs keep ID-specific
wording and alternatives; add the one-copy emphasis only for multiple copies.

Electronic Endorsement asks for the document owner's details without a separate
requester information or address section. Existing submissions retain their saved
form version and answers.

For CTC issuance and Email Inquiry online applications,
requester names come from the signed-in account profile.
Autofilled requester names select No middle name when the saved middle name is
blank or the account's no-middle-name flag is set; owner autofill carries this
choice too. CTC Local/Abroad and Email Inquiry birth-record forms collect the
mother's maiden name as first, middle, and maiden last name, with No middle name
available for the middle part. Verification PDFs join the parts and retain support
for older requests saved with one mother-maiden-name field.
Keep these name fields read-only, including the no-middle-name checkbox;
document owner fields remain separate. Submission also uses the saved profile name.

Marriage License asks whether the account holder is the Bride or Groom.
Both birth dates appear with the Bride/Groom names on the details page.
Show underage warnings and block progression there; keep consent/advice
requirement calculations and server validation based on those same fields.
On-time and delayed Marriage Certificate applications ask Husband or Wife.
The selected party's name comes from the account and is read-only, including
the no-middle-name choice and suffix. The partner's name stays editable.
A blank account middle name or an explicit "No middle name" setting shows N/A
with the checked, locked checkbox when the applicant selects their marriage role.
The role is saved with the draft; changing it clears the previous account slot.
Hide the extra "Your role" and "Your details" section headings on these forms;
keep the role question and individual party headings.
Submission uses the saved profile name for the selected party. Staff walk-in
intake omits this account-role question.

- React and TypeScript with TanStack Start/Router. Routes live in `src/routes`;
  feature pages and their components live in `src/features`.
- [components.json](../components.json) configures shadcn `base-vega`, Base UI,
  `rsc: false`, Lucide icons, and `~/` import aliases.
- Shared controls are local source in `src/components/ui`. Read their actual
  exports and props before using an upstream example: these controls have been
  customized for Civicheck.
- Tailwind v4 tokens and shared classes live in
  [app.css](../src/styles/app.css). Use `cn` from `~/lib/utils` for conditional
  classes and the project's pnpm package manager for commands.
- TanStack Table is **v9**. Read [table.ts](../src/lib/table.ts) and the installed
  Intent skills when changing tables. Existing tables use `useTable` and
  `appTableFeatures`; v8 `useReactTable` examples need adaptation.

## Choose the right surface

| Surface | Existing reference | Starting pattern |
| --- | --- | --- |
| Citizen home | [CitizenDashboard](../src/features/dashboard/pages/CitizenDashboard.tsx) | `portal-page`, `portal-title`, one current request and its next useful action, then attention items and secondary requests. |
| Citizen request list | [MyRequestsPage](../src/features/requests/pages/MyRequestsPage.tsx) | Readable request rows, status pills, transaction references, and an actionable first-use empty state. |
| Citizen profile | [ProfilePage](../src/features/account/pages/ProfilePage.tsx) | Account identity, Settings, persistent Light/Dark preference, Report a problem, and Log out. Reuse the existing settings dialog and sign-out route. |
| Citizen request detail | [MyRequestDetailPage](../src/features/requests/pages/MyRequestDetailPage.tsx) | Status pill in the header; independent desktop columns keep documents below progress and guidance, with status history in its own tile directly below the compact details/acknowledgment card. On smaller screens, keep details and history together between progress and documents. Show rejected files first with re-upload highlighting, followed by missing uploads and the remaining files. Preserve file numbering across those sections, actual image thumbnails, short document titles, and supporting text for examples and copy requirements. |
| Citizen feedback | [RequestFeedbackCard](../src/features/feedback/components/RequestFeedbackCard.tsx) | Released requests offer an optional survey in a dialog. Five stars use labelled radio choices, a required overall rating, and optional ease rating, topics, and comment. Submitted responses are read-only. |
| Feedback and problem review | [AdminFeedbackPage](../src/features/feedback/components/AdminFeedbackPage.tsx) | Separate survey and problem-report tabs, service/date filters, server pagination, full filtered survey summaries, and a review dialog. Only admins can read other citizens' submissions. |
| Staff queue | [RequestsPage](../src/features/requests/pages/RequestsPage.tsx) | `dashboard-page`, page header, filters, table, and pagination; preserve the route-owned filters and department scope. |
| Admin list | [ServicesPage](../src/features/admin/services/pages/ServicesPage.tsx) | `PageHeaderCard` plus a feature table built on `DataTableCard`. |
| Staff home | [StaffDashboard](../src/features/dashboard/StaffDashboard.tsx) | Operational priorities and available actions appropriate to the role. |
| Application steps | [WizardShell](../src/features/apply/components/WizardShell.tsx) | Existing step shell, title, form, optional guidance sidebar, and `WizardFooterActions`. |
| Service editor | [ServiceFormPage](../src/features/admin/services/components/ServiceFormPage.tsx) | Full-height workspace, persistent header/actions, section tabs, scrollable body, and unsaved-change handling. |

The dashboard shell and citizen navigation are already composed in
[the dashboard layout route](../src/routes/_authed/_dashboard/route.tsx) and
`src/components/sidebar-01`. Extend those instead of introducing a second shell
inside a feature page. Keep routes responsible for their existing loaders,
permission checks, search parameters, and pending components.

Delayed death registration asks whether the basis is more than 30 days since
death or no existing LCR/PSA record. The latter permits dates within 30 days;
staff still verify the supporting documents. Its burial certificate is mandatory
when Buried is selected and does not apply when Cremated is selected.
The cashier can verify delayed-death payment during Processing once staff record
the notice-posting date. Payment does not complete posting or make the document
ready to claim; those messages wait until Ready for Release.

Use `QuietLink` and `QuietAnchor` for every app link. Server-rendered links keep
their native destinations. After hydration, the shared component suppresses
browser hover destinations while preserving link roles, keyboard activation,
router preloading, modified clicks, file downloads, and native context menus.
Keep composed primitives' supplied role and tab index; never bypass the shared
component with a plain router `Link` or `<a>` in UI source.

Citizen mobile navigation shows Home, Services, Requests, then Profile. The top
bell sits at the far right, opens the full Notifications page, and retains its
unread dot. Profile is accessed through the bottom navigation without a duplicate
header avatar. Profile is mobile-only: omit it from desktop navigation and search
destinations, and send desktop visits to the dashboard, including after a resize.
Desktop keeps Settings and Log out in the existing account menu, with the theme
switch in Settings. On mobile, theme controls live in Profile, alongside
the account name/email, the existing Settings dialog, Report a problem, and
Log out. Both reuse the stored theme; staff controls are unchanged.
Keep the citizen frame and page loading views aligned with these destinations.
The Profile page and its loading view show the Profile heading above the account
card, without an introductory subtitle.
When enlarged text leaves too little room in the bottom bar, collapse the active
label to its icon while preserving every accessible name and a 44px minimum tap
target. Base this on the bar's available width so all four destinations fit.
At enlarged text sizes, the Profile account identity and theme choices stack
within the card. Let action labels wrap without clipping, including in loading.
Settings suffix and password controls use the same 48px mobile height as the
other fields, with 44px password reveal buttons. Keep footer actions in one grid
row with equal heights and wrapping labels; they must remain reachable on short
screens. Desktop settings controls retain their 44px height.
Settings keeps unsaved edits in both tabs. Saving one tab returns to the other
if it still has edits; close only after both are saved or explicitly discarded.
Cancel uses the same discard confirmation as the close button and Escape.
While a save is pending, disable its fields, tab switching, and dismissal. Show
request failures inside Settings, preserve the entered values, and allow retry.

Problem reporting is available from the citizen sidebar, Profile page,
and application footer. These open the same dialog mounted in the authenticated
layout, preserving the current page and the applicant's request context when
available. Record only the page path, without search parameters or submitted form
answers. Reports show a reference after saving; survey and report failures retain
entered values. These are independent Civicheck feedback forms; they do not
change a request's status or payment flow.

Keep optional feedback-loading failures inside the feedback card, with a retry
action; they must not prevent a citizen opening the completed request or its
documents. A failed read must be distinct from having no saved response.

## Visual language

**Type.** Keep Geist as the application font and Geist Mono for transaction
references and other code-like identifiers. Citizen titles use `portal-title`
(28px on small screens, 38px from `md`); section headings use `portal-heading`.
Admin list titles use the compact 18px heading in `PageHeaderCard`. Match the
surface rather than applying one title size everywhere.

Downloaded acknowledgment and verification PDFs use regular hyphens in place of
em dashes, including text from service settings and form answers.

**Color.** Use semantic utilities such as `bg-card`, `text-foreground`,
`text-muted-foreground`, `text-body-2`, `bg-primary-soft`, and `border-border`.
The light theme's brand blue is `#0b4da2`, with red and gold accent tokens; use
the token names in components so their dark equivalents continue to work.

| Intended role | Token or existing utility |
| --- | --- |
| Blue text, borders, focus accents | `primary` / `primary-hover` |
| Solid blue action with a light label | `primary-fill` / `primary-fill-hover` with `primary-foreground` |
| Blue hero/header background | `hero-fill` and the existing hero composition |
| Low-emphasis surface | `muted`, `surface-subtle`, or the appropriate portal token |
| Request/payment/visit state | Existing badge variants and `tone-*` pairs |
| Health/status callout | Matching `health-*-bg`, `health-*-border`, and `health-*-fg` |

The distinction between `primary` ink and `primary-fill` backgrounds matters in
dark mode: white labels cannot simply be placed on the lighter blue ink token.
Themes are managed by [ThemeScope](../src/components/theme-scope.tsx) and
[theme.ts](../src/lib/theme.ts), with the `dark` class on `html` and
`civicheck-theme` storage. Reuse that mechanism for both themes.

**Shape and spacing.** `dashboard-page` provides a centered 1440px maximum width
and 24px vertical spacing. Admin headers and table cards use `rounded-xl`,
`border-border-strong`, and compact padding. Citizen request cards commonly use
`rounded-4xl` (24px) or 28px corners and `shadow-portal-card`; use the nearest
reference page. The utility named `portal-card` is a separate, quieter 16px
borderless/shadowless treatment. Do not assume these treatments are identical.
Use existing responsive padding and `gap-*` for new layouts.

Citizen notification groups, empty states, and their loading view use
`rounded-xl` corners and `shadow-portal-card` at all viewport sizes. Notification
groups retain the subtle `ring-2 ring-border-light` outline without divider lines
between rows; their loading view matches.

**Identity.** Reuse [CiviCheckIdentity and CityGovernmentIdentity](../src/components/brand/civic-identity.tsx).
They currently render text initials for the office/city marks. Preserve that
representation when extending the UI; replacing brand artwork is a separate
design change.

## Component recipes

| Need | Reuse and local details |
| --- | --- |
| Page header/actions | [PageHeaderCard](../src/components/ui/page-header-card.tsx): `title`, `description`, and action children which wrap on narrow screens. |
| Buttons | [Button](../src/components/ui/button.tsx): defaults are `variant="default"`, `size="lg"`, `shape="pill"`. Local variants include `raised`, `tonal`, `field`, and `lifted`; choose by purpose. `touch` and `icon-touch` give 44px controls. |
| Navigation action | [QuietLink / QuietAnchor](../src/components/quiet-link.tsx), with `buttonVariants` when appropriate. Base UI composition uses `render`, not Radix `asChild`. |
| Citizen buttons/tables | [portal/styles.ts](../src/components/portal/styles.ts): reuse `pillButton` and `portalTable` where that visual treatment applies. |
| Data table | [DataTableCard](../src/components/ui/data-table-card.tsx), toolbar, pagination, and column-header helpers. Supply the table's accessible `label` and an `emptyLabel`; use `onClearFilters` for filtered results. |
| Form controls | [Field](../src/components/ui/field.tsx), `FieldGroup`, `FieldLabel`, `FieldDescription`, `FieldError`, and existing input/select wrappers. Keep labels associated with controls; use `data-invalid` on the field and `aria-invalid` on its input. |
| Settings sections | [SettingGroup](../src/components/ui/setting-group.tsx) for its labeled section header and padded/divided content. |
| Request status | [StatusPill](../src/features/requests/components/StatusPill.tsx) and [request-status.ts](../src/features/services/request-status.ts). Reuse `getStatusDetails`, audience-specific notes, and timeline helpers instead of inventing labels or colors. |
| Other status badges | [Badge](../src/components/ui/badge.tsx): `info`, `progress`, `success`, `warning`, `neutral`, `destructive`; service classifications have their own variants. |
| Notifications | Existing [Sonner wrapper](../src/components/ui/sonner.tsx) and `toast` from `sonner`. The root already mounts the toaster. Generic Base UI examples recommending a different toast system do not describe this project. |

Realtime notification arrivals use the existing persistent
`NewNotificationToasts` preview. On mobile, show only the latest card, with a
two-line message, a single-line service label, and a 44px dismiss target. Keep
the card above the bottom navigation and its safe area. Older arrivals stay
queued: dismissing the latest reveals the previous one; the count link opens
Notifications and clears the pop-ups without marking the other messages read.
Desktop keeps the full stack and timestamps.
| Empty/error states | [Empty](../src/components/ui/empty.tsx), [Alert](../src/components/ui/alert.tsx), and the feature's existing error handling. Distinguish no records yet from no filter matches. |
| Loading | [PageSkeleton / TablePageSkeleton](../src/components/feedback/PageSkeleton.tsx), feature skeletons, [Skeleton](../src/components/ui/skeleton.tsx), and [Spinner](../src/components/ui/spinner.tsx). Match the loaded layout and preserve the router's pending timing. |
| Unsaved changes | [DiscardChangesDialog](../src/components/feedback/DiscardChangesDialog.tsx) and the feature's existing navigation guard. |
| Charts | [chart.tsx](../src/components/ui/chart.tsx) with the project's Recharts setup; follow the nearby feature for specialist charts. |

Keep icon-only controls named with an accessible label. Decorative Lucide icons
use `aria-hidden="true"`; button icons use `data-icon="inline-start"` or
`inline-end` so the wrapper controls sizing and spacing. Dialogs and sheets need
their title components, including when the title is visually hidden.

Citizen request headers place a copy button beside the tracking number. Copy
the complete number, confirm success with Sonner, and keep the number selectable
with a helpful error if clipboard access fails.

Logout uses an immediate, full-page “Signing out…” status with the shared
`Spinner` in [the logout route](../src/routes/logout.tsx). Keep that transition
consistent across portal pages instead of showing a content skeleton.

Login, create account, forgot password, OTP verification, and returning to the landing page use
[simplePageTransition](../src/components/motion/simple-page-transition.ts) for
both mobile and desktop navigation. Keep the current page visible until the
destination is ready, with no skeleton or minimum loading delay. Parent and lazy
route fallbacks also omit skeletons for these destinations. Auth forms use a
simple fade entrance that respects reduced motion; the landing page retains its
existing entrance animations. The password-recovery OTP step also fades in.

Verification keeps the signup email fixed, displays it on its own line, and
uses eight separate code boxes with an inline resend action. Standalone auth
steps use an arrow-only back link with a screen-reader label, matching signup.
On signup verification, an explicit paste of exactly eight digits (optionally
separated by spaces or hyphens) submits one server check. Typed, partial, and
longer codes keep the manual confirm action. Code entry and resend pause while
checking; only server acceptance continues to the dashboard. Digit fill,
checking, and rejection motion respects reduced-motion preferences.
Sign-up keeps the horizontal checkbox CAPTCHA, with its logo beside the checkbox.
Center it within the form at every screen size. On containers narrower than its
304px width, scale the complete widget
to fit and reserve its scaled height. Resizing preserves the same widget and its
verification; retry, expiry, and submitted tokens keep their existing behavior.
Keep signup checkbox labels at least 44px tall. Mobile sign-in helper notes and
field errors stay in normal flow so wrapped text cannot overlap other controls.
Shared auth fields remain at least 44px tall. Code entry focuses automatically
only for a fine pointer, keeping the mobile keyboard closed until the user taps.
Auth mobile layout and verification regressions run with
`pnpm.cmd exec playwright test --config=tests/auth/playwright.config.ts`.
The browser suite uses controlled CAPTCHA and account-service responses to check
responsive sizes, loading and retry states, single-use tokens, and code entry.
The floating development toolbar mounts only on development screens at least
768px wide with a fine pointer, so it cannot obscure mobile controls.

The citizen's full-details dialog uses `SubmittedDetailsCard` with
`variant="dialog"`: sentence-case labels, compact grouped answers, and two
columns where space permits. Its tracking badge and close action stay in the
header while the body scrolls. Staff views retain their existing variants.

Submitted answers use the option labels from the application's saved form
template across services, with readable fallbacks such as Male, Female, Yes,
and No for legacy records. Keep names, contact details, references, and notes
as entered; display formatting must not change stored answers.

Birth and on-time/delayed marriage and death walk-in intake use their published registration
forms, shared name fields, date checks, and physical-document confirmation. The
accepted request starts in Processing with staff acceptance recorded; payment
and posting requirements still apply. Marriage names use Husband and Maiden Name
of Wife labels. Death uses Name of the deceased and its death-specific case questions.
Marriage License walk-in intake copies both applicants' names, birth dates,
nationality, civil status, and optional contact number from their application.
Use age at application for its conditional checklist. Staff confirm the physical
filing papers and both applicants' personal appearance before encoding.
Omit account-role, wedding-plan, purpose, upload, and posting-date questions.
The request starts Processing unpaid; counseling and posting remain later steps.
Application screens omit generic service-selection explanations and the
requester/owner introduction that repeats section headings. The selected-service
confirmation is announced to screen readers; the summary shows its name visually.
Keep authorization notes and the existing upload/review instructions visible.
Omit standalone name-entry, account-requester, court-scope, death-date, fee-origin,
petition-introduction, and deferred-date explanations. Marriage-license age
notices show only blocking titles; registration-window notices keep their titles
and switch actions without explanatory bodies. Center the registration-window
notice's icon, title, and switch action together within its full-width panel.
Validation, account-name locks,
service routing, and requirement rules still apply.
Marriage License shows a short warning only when the intended wedding date is
less than ten calendar days away. This warns without blocking submission or
promising issuance on later dates; posting starts when CCRO posts the notice.
Keep the Charter's P1,100 total; do not infer a separate solemnization
amount from the incomplete fee breakdown on PDF page 12.

The walk-in registration requirements dialog filters by the selected service and current
answers. Matched conditions say "Applies to this request"; unanswered conditions
keep "Depends on case answers". General service references keep their case labels.
Requirement rows show copy quantities and other instructions below the document
name, with where to secure it on a separate line.

For walk-in birth, marriage and death intake, staff first confirm that the physical
papers are complete and acceptable. That acceptance and its staff/time history
are saved with a new request in Processing, skipping the initial online review
stages. Legitimation walk-in intake uses the same acceptance flow and also records
the couple's personal appearance. It omits filer and eligibility questions;
marriage place remains optional, and the COLB father-name answer filters the
Admission of Paternity requirement. Final registration and release checks still apply. Other walk-in services
keep their existing intake flow. Staff must confirm checking the originals before
marking registration requests ready for release. Release reuses that recorded check unless documents changed
or the request returned to validation. Other physical services confirm at
release; older ready registrations without a recorded check also confirm there.
The confirmation is
enforced by the server and database, and History records the staff member and
time separately from upload acceptance. Email inquiries stay online-only.

Returning a request from Processing or Ready for Release requires a reason.
The staff detail page shows outstanding return and document-review concerns
above the tabs, with who raised them and when, until validation moves forward.
Physical release requires separate identity/authority and handover confirmations;
each is enforced on the server and recorded separately in staff History.
Online inquiries require identity verification but no physical handover.

## Interaction and responsive behavior

On mobile, the application header shows Change service beside the CiviCheck
identity, with the numbered progress rail below. Omit the redundant Step X of 4
badge and the service card's extra mobile options menu. Desktop keeps Change
service in the service card. Both actions share the same draft choices: keeping
progress or confirming discard before switching services. The mobile loading
header keeps Change service visible and disabled until the draft is ready.

On the document-upload step, hide Details so far below the 768px mobile breakpoint,
including its sidebar space. Mobile uses Take photo and Choose files with solid
upload-card borders; omit drag-and-drop instructions and handlers. Desktop keeps
the summary, instructions, dashed empty cards, and drag-and-drop behavior.
The wizard's main card must shrink within its mobile grid column. Long file
names truncate inside upload rows during and after upload; they must not widen
the page or push preview, remove, and upload actions outside the phone viewport.
After submission, keep the acknowledgment download, optional Verification Form,
and View my requests actions stacked within the mobile tracking card. Labels
wrap and buttons grow vertically while retaining at least a 52px touch target.
Desktop keeps its existing wrapping action row and button dimensions.

Application confirmations keep a single shrinkable content column, wrap long
titles and action labels, and stack actions on phones. Shared Dialog and
AlertDialog panels stay within the dynamic viewport height and scroll when
content is taller, including at larger text sizes. Keep mobile gutters on
centered panels; draft bottom sheets retain their full-width mobile layout.
The registration-switch dialog applies this layout to every service using it.

The [welcome tutorial](../src/features/onboarding/components/WelcomeTutorial.tsx)
fits the mobile viewport without scrolling. Mobile slides use compact artwork,
type, and spacing, and only the current slide determines the content height.
Keep the progress dots and action row outside the shrinking content area so
Skip, Show me, Back, and Next stay visible. Short viewports omit the decorative
artwork to leave room for the full instructions and touch-sized actions.

Uploaded photos and PDFs share
[FilePreviewDialogContent](../src/components/file-preview/FilePreviewDialogContent.tsx)
in the citizen request and application previews: a document title, file-type
description, open-in-new-tab and close actions, followed by a separate toolbar
and a bordered subtle canvas. Reuse
[PreviewToolbar](../src/components/file-preview/PreviewToolbar.tsx) for zoom and
Fit to window. Photos keep their natural size when smaller than the canvas,
with an optional magnifier switch; PDFs add page navigation and retain scroll
access to every page. Controls wrap above the canvas on small screens.
Image fitting measures the outer canvas's content box. Keep scrollbar and image
size changes out of that measurement so the photo stays still while inspecting it.
While downloading or rendering, use `FilePreviewLoading` to keep the canvas
visible with a loading indicator. Reveal decoded photos and rendered PDF pages
with `civic-enter-fade`, which respects reduced-motion settings.

The landing hero introduces its headline, actions, and checklist with staggered
`civic-enter` delays; the process section uses `Reveal` below the fold. The
checklist uses the local Tabs `glide` indicator as a sliding pill and a sideways
content entrance with staggered rows. Keep the card focused on the checklist
without playback labels or a countdown bar. Automatic
rotation pauses on hover, keyboard focus, hidden tabs, or the pause control, and
starts disabled for reduced motion. Preserve those pause behaviors.

The landing page, Requirements, and Track request use the same header widths,
maximum width, and responsive gutters from `landing.css`. Keep active navigation
links the same font weight so changing pages does not shift the logo or links.

Public Requirements and Track request pages introduce their headings with
`civic-enter-sm`, followed by delayed controls or the tracking form using
`enterDelay`. Requirements rows use `civic-stagger` with delays capped at the
sixth row; expanded details fade in with `civic-content-in`. Keep skeletons
immediately visible and preserve the shared reduced-motion behavior.

The citizen request detail page introduces its header with `civic-enter-sm`,
then staggers its guidance, summary, documents, and history groups with
`civic-stagger` and `staggerStyle`. Key the page content by request ID so opening
a different request replays the entrance while updates to the same request
preserve the current content and interactions.
Keep the citizen request header focused on the service name and tracking number;
omit the duplicate status badge from both the header and its loading view.
Status history and the stage tracker continue to show request progress.
In the single-column mobile request view, show What to do next, Documents,
Submitted details, then Status history. Match that order in the loading view.
Keep the existing two-column desktop placement of these sections.

Status history keeps its original solid circles: 16px for the current entry,
12px for earlier entries, with no icons. Animate only a halo in the circle's
own color: a ripple for validation, a working pulse for processing, a slow
breath for readiness, a centered ripple for uploads/resubmissions, and a double
pulse for attention or rejection. Every halo repeats so entries remain visibly
animated after the page entrance or scrolling. Current halos cycle every
2.4 to 4 seconds; past entries use a slower, softer gray halo. The halo starts
outside the solid dot; keep its spread compact and opacity low, with just
enough color to remain visible beyond the static ring. Keep every halo centered
on its solid circle throughout the animation. Reduced motion
removes the halo. Preserve the original spacing, labels, and timestamps.

The request-page `StageTracker` uses `civic-live-step` for a gentle outward ripple
around the current stage. Completed, future, rejected, and cancelled stages stay
still. This halo also stops when reduced motion is enabled.
On mobile, center all four stage labels beneath 32px nodes, with continuous,
visible connectors and stronger completed segments. Keep complete labels at
320px and allow wrapping when text is enlarged. Mobile request titles use 22px,
tracking numbers 13px, and next-step instructions 14px with 22px line spacing.
Documents and Status history headings use 18px on mobile to stay below the title.
Use the tighter mobile progress-card padding and gaps in the loading view too.
Keep desktop request typography and tracker spacing unchanged.

- Make the current stage and next useful action clear to a citizen. Keep staff
  screens efficient for scanning and repeated work. Preserve existing role-aware
  actions and terminology when changing presentation.
- Keep long names, reference numbers, and translated/expanded copy from forcing
  page overflow. Use `min-w-0`, wrapping, and the existing mobile layouts.
  Tables may scroll horizontally inside their card; the entire page should not.
- Keep the applicant dashboard's compact hero, single-column request rows, and
  two-column service strip through tablet widths. Its desktop sidebar reduces
  the page's usable width, so the wide dashboard composition starts at `xl`.
  On phones with existing requests, the current request is the visual focus.
  Show all four service shortcuts in a quiet two-column grid with small artwork,
  a muted Start a new request heading, a compact View request action, and a
  lightweight How it works action. Keep both actions at least 44px tall. Preserve
  the larger illustrated service chooser for first-time applicants and the
  existing desktop presentation. Match the loading view to these sizes.
  The mobile greeting reads Welcome back without the person's name; keep the
  personalized greeting from `md` upward.
- The wizard keeps a consistent main-card width when adding a sidebar, stacks
  the sidebar below on smaller screens, and offsets it below the sticky service
  band. Preserve that behavior and the `.apply-wizard` scroll-padding rules.
- Service-editor typography is intentionally scoped by `data-service-editor` in
  `app.css`. Preserve the scope, `min-h-0` scroll layout, and safe-area padding
  instead of changing shared controls to achieve an editor-only adjustment.
- Reuse `civic-enter`, `civic-content-in`, `civic-stagger`, `civic-press`, and
  [stagger helpers](../src/components/motion/stagger.ts) for appropriate motion.
  [Reveal](../src/components/motion/reveal.tsx) is for below-fold sections on long
  pages. Keep reduced-motion behavior and immediately visible loading layouts.
- For mutations, expose a pending state and prevent duplicate submission; retain
  entered values on failure and show an actionable error. Reuse the current
  feature's mutation flow and success feedback.

## Working with skills and registries

R.A. 9255 walk-in intake uses the checked-paper form for legal staff. Keep the
child's name as recorded on the birth certificate, both parents' names, birth
details, and the acknowledgment answer. Registry number, contact number, and
notes are optional. Omit online filer/purpose questions and uploads. Staff must
resolve acknowledgment to Yes or No and confirm physical documents and the
required personal appearance, signatures, and attestation for the child's age.
Accepted requests start in Processing and remain unpaid. Display the base fee
separately from conditional paternity and per-page charges.
Use "Surname Change Details" and "Child and Parent Information" as the walk-in
section headings. Show the matching age instruction beside the personal-appearance
confirmation. Staff check physical copy counts; do not show online upload advice.

Surname-change birth date and place appear directly beneath the child's suffix
and sex on the details page, with the same spacing as other child details.
Keep these fields inside the child's section in walk-in intake as well.
Surname-change case fields omit helper paragraphs in both applicant and walk-in
forms. Keep the birth date and place controls aligned. Affidavit instructions
show only the signer and appearance wording for the entered birth date; age 7
needs staff verification because the Charter's ranges overlap. Keep the same
requirement ID and upload slot when the displayed wording changes.

Start with the repository's Intent skill check from `AGENTS.md`. Use the local
`civicheck-ui` skill to apply this guide, the installed `shadcn` skill for component
APIs and registry operations, `frontend-design` when developing a visual
direction, and `web-design-guidelines` for a relevant accessibility/UX review.
Keep visual exploration within the requested screen and Civicheck's established
identity unless the user requests a broader redesign.

The shadcn MCP server can browse the registries in `components.json`:
`@blocks-so`, `@blockus`, `@flx`, and `@reui`, plus built-in `@shadcn`.
Discover a suitable component only after checking local wrappers. Before adopting
a registry item, inspect its files, dependencies, Base UI compatibility, `~/`
imports, and styling. Existing controls are customized; preview an upstream
update with `--dry-run` / `--diff` and preserve local behavior.

If MCP is unavailable in a session, use the CLI from the workspace root:

```powershell
pnpm.cmd dlx shadcn@latest info --json
pnpm.cmd dlx shadcn@latest docs button dialog select
```

Fetch the documentation URLs returned by `docs` when their API details are needed.
Use `pnpm` instead of `pnpm.cmd` on non-Windows shells.

## Verify a UI change

Loading views keep fixed page titles, navigation, labels, action text, and
bundled artwork visible. Scope skeletons and loading announcements to content
that is still being fetched: rows, counts, current requirements, request names,
submitted answers, status history, and live readings. Do not show an empty state
or a zero count before the read completes. Data-dependent actions keep their
labels but stay disabled until the required data is available. Share fixed
headers between the loaded and pending views where practical, and use the
destination-specific content fallback when a parent loader is pending.

For a visible change, inspect the affected screen in a browser at a narrow mobile
width and a desktop width, in light and dark themes. Check the relevant loading,
empty, error, validation, disabled, and success states. Exercise the changed
interaction with keyboard and pointer, verify focus and overlay behavior, and
inspect screenshots for clipping, overflow, contrast, and layout shifts. Check
reduced motion when motion changes. If authentication or data prevents checking
a state, report exactly what remains unverified.

Run checks appropriate to the change: `pnpm.cmd build` includes TypeScript,
`pnpm.cmd lint` checks source, and focused tests cover changed behavior. Keep
documentation-only work to link/content validation. Update this guide when a
deliberate shared UI convention changes.

Image fitting, zoom, magnifier, and resize regressions run without authentication:
`pnpm.cmd exec playwright test --config=tests/file-preview/playwright.config.ts`.

Loading-view regressions also run without authentication:
`pnpm.cmd exec playwright test --config=tests/loading/playwright.config.ts`.
These use controlled delayed reads to check that headings and navigation remain
visible before data resolves, and check loading layouts at mobile and desktop
widths in both themes.

Birth-date entry regressions run without authentication:
`pnpm.cmd exec playwright test --config=tests/birth-date/playwright.config.ts`.
These exercise the shared service form, saved dates, partial entries, month
lengths, leap years, keyboard selection, future-date limits, and both themes at
mobile and desktop widths.

Application-dialog regressions run without authentication:
`pnpm.cmd exec playwright test --config=tests/mobile-dialogs/playwright.config.ts`.
These cover registration switching across birth, marriage, and death services,
draft and exit confirmations, shared alert dialogs, narrow and short mobile
viewports, larger text, and focus return in both themes.

Court-decree selection distinguishes adoption, foreign decree, and annulment/nullity.
The application docket uses the full Charter group title as its main title,
without a duplicate family subtitle, even after a court-decree type is selected.
Court-document requirement labels follow the comma-separated checklist on Charter
PDF page 20. Do not turn Certificate of Finality, Entry of Judgment, and the
applicable decrees into slash-separated alternatives. Preserve the list in titles
and separate only the copy-count instruction.
Legal separation is not an available choice. Save court_decree_type separately from the fee-group code.
Keep the choice tiles label-only; show fees in the existing service summary.
Render "Which court decree are you registering?" as a regular field legend,
not a section/group heading. Omit the "Court decree type" heading.
Match that question to the 15px semibold field labels and omit the court-decree
case step's "Request details" section heading.
Adoption details uses "Adopted person's name" as a 20px
group heading beneath the shared Person and Record Details page title. Enter the name as recorded on the
birth certificate and collect birth date/place and optional registry number.
Keep a 4px gap between the adoption heading and its instruction.
Never show or add help text beneath registry-number fields in any service,
including staff walk-ins. The shared renderer omits it even for older templates.
Annulment/nullity collects both spouses' recorded names, marriage date/place,
under the shared Person and Record Details form title,
with no introductory spouse-name instruction or divider above the first spouse.
and optional registry number. Foreign decree asks which record is affected
(birth or marriage), then uses the matching names and record fields. Do not
reuse birth details as marriage details when switching cases. Keep suffix and
contact optional and omit Sex for adoption/foreign-decree intake. These are
supporting archive-search details, not additional documentary requirements or
a Legazpi residency rule. Review and submission preserve both spouses when a
foreign decree affects a marriage record.
Adoption and foreign decree share the configured ₱500 fee group; annulment/nullity
uses ₱700. Do not include a legal-separation option or its former guidance box.
Checked walk-ins under the ₱500 group must choose adoption or foreign decree.
When the issuing court is uncertain, the Processing confirmation requires staff
to verify the court and the additional certificate if applicable. The check is
recorded in request history.

Court-decree forms omit the decision date, issuing court name, and docket number;
staff read these details from the court papers. Keep the RTC Legazpi question
for the conditional certificate requirement.
Legal staff encode court-decree walk-ins from checked physical papers. Ask for
three separate service choices (Adoption, Foreign decree, Annulment/nullity) in
the staff service picker. Open the matching form directly without a repeated
decree-type question; preserve the shared underlying fee group. Use the full
Charter service title as the selected court-decree dialog title. Collect
the matching birth/marriage identification details and optional contact/notes.
Do not ask for purpose, sex, or uploads. The RTC
Legazpi answer must be Yes or No. Physical acceptance records the staff member
and starts Processing; payment and release keep their existing checks.

The shared applicant What to do next card uses 14px regular instructions with
22px line spacing on mobile, and 15px with 28px line spacing on desktop, with
small numbered markers across all services. Keep the
section heading distinct without making the full instruction bold. Each sentence
starts on its own line and wraps naturally on smaller screens.

Service forms use the same typography for online applications and staff walk-ins:
32px titles, 24px section headings, 20px group headings, 17px inputs and dropdown
options (including phone numbers), 15px labels, choices, instructions,
confirmations and buttons, and 14px helper text and validation errors.
Phone-number input groups use the same 56px height and grid column widths as
neighboring form controls; keep this height above the input group's size preset.
Scope these rules with `data-service-form`; portalled dropdowns and location
searches use `service-form-options`. Shared heading constants identify their
role even when a group heading uses an h2 element.

On-time birth intake omits the selector title, Request details heading, and birth-date helper.
Birth date and place appear below the child's name and suffix on page 2, using
the existing date validation and registration-track switch. The first group reads
Child's Information and has no extra divider above it.

Applicant request pages show on-time registration deadlines and period reminders in a separate Registration deadline card above Submitted details. On mobile this follows the progress card. Keep review updates and waiting/visit instructions in What to do next. Hide the deadline card once ready for release or closed.

Online on-time birth details ask Requester's relationship to the child below the father's name. The dropdown is required; Other requires Please specify. These describe a relationship or role and do not establish registration authority. Keep the same validation and saved answers in review and server submission.

On-time birth walk-ins reuse the applicant birth layout and requester relationship fields. Show Child's Information with calendar DOB beside suffix/sex on desktop, full-width birth place below, then mother's maiden name and father fields in first/middle/last order. Keep the divider above relationship/contact, required Other specification, Maria placeholder, and physical-document acceptance. Client and server use the same walk-in definition and date checks.

The shared walk-in intake dialog uses a wider desktop layout. Service picker options and the selected service wrap long names; keep them readable within the mobile viewport without reducing the standard font size.
