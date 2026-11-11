# Civicheck UI guide

Legal staff use petition walk-in intake for R.A. 9048/10172. Record the scope,
record owner's name and sex as recorded, record reference, and proposed changes.
Clerical correction uses the selected service directly; combined petitions keep
the scope choices needed for their fields and checklist. Do not ask online
eligibility questions or require uploads. Staff confirm the filing papers and
authority to file before the request starts Processing. Publication and PSA
affirmation remain later office steps; intake does not mark payment or release
complete. The existing limitation on applying indigency exemptions remains.

Use this guide when creating or changing Civicheck screens. It describes the
existing application, with source files to read before implementing a pattern.
An explicit design request can change these conventions; ordinary feature work
should extend the nearest existing screen. When source code changes, update the
affected guidance rather than treating this snapshot as a second implementation.

## Project foundation

For CTC issuance, Email Inquiry, and Electronic Endorsement online applications,
requester names come from the signed-in account profile.
Keep these name fields read-only, including the no-middle-name checkbox;
document owner fields remain separate. Submission also uses the saved profile name.

Marriage License asks whether the account holder is the Bride or Groom.
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

Problem reporting is available from the citizen sidebar, mobile account menu,
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

Login uses [LoginPageSkeleton](../src/features/auth/components/LoginPageSkeleton.tsx)
for both route and parent pending states. It shares `LoginLayout` and its CSS
with the loaded form, including responsive field sizes and artwork visibility.
Keep the loading layout immediately visible and preserve router pending timing.

Verification keeps the signup email fixed, displays it on its own line, and
uses eight separate code boxes with an inline resend action. Standalone auth
steps use an arrow-only back link with a screen-reader label, matching signup.
On signup verification, an explicit paste of exactly eight digits (optionally
separated by spaces or hyphens) submits one server check. Typed, partial, and
longer codes keep the manual confirm action. Code entry and resend pause while
checking; only server acceptance continues to the dashboard. Digit fill,
checking, and rejection motion respects reduced-motion preferences.

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
and switch actions without explanatory bodies. Validation, account-name locks,
service routing, and requirement rules still apply.
Do not show a posting-period warning beside the intended wedding date or impose
a minimum lead-time cutoff. Keep posting guidance in the service instructions
and request progress. Keep the Charter's P1,100 total; do not infer a separate solemnization
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

- Make the current stage and next useful action clear to a citizen. Keep staff
  screens efficient for scanning and repeated work. Preserve existing role-aware
  actions and terminology when changing presentation.
- Keep long names, reference numbers, and translated/expanded copy from forcing
  page overflow. Use `min-w-0`, wrapping, and the existing mobile layouts.
  Tables may scroll horizontally inside their card; the entire page should not.
- Keep the applicant dashboard's compact hero, single-column request rows, and
  two-column service strip through tablet widths. Its desktop sidebar reduces
  the page's usable width, so the wide dashboard composition starts at `xl`.
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

Court-decree online options cover foreign decree/adoption and annulment/nullity;
show the legal-separation coverage note beside the application case selector.
When the issuing court is uncertain, the Processing confirmation requires staff
to verify the court and the additional certificate if applicable. The check is
recorded in request history.

Legal staff encode court-decree walk-ins from checked physical papers. Ask for
the decision date, issuing court, optional docket number, names on the decree,
and optional contact/notes. Do not ask for purpose, sex, or uploads. The RTC
Legazpi answer must be Yes or No. Physical acceptance records the staff member
and starts Processing; payment and release keep their existing checks.
