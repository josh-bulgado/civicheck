# Service Editor Redesign — Design

Redesign of the admin **Edit Service** screen (`/admin/services/$serviceCode/edit`, rendered by `ServiceFormPage`). The design was iterated and approved as an interactive prototype; this document records the decisions so the prototype is not the only source.

**Visual and behavioral reference (approved):** `docs/superpowers/specs/assets/2026-10-19-service-editor-prototype.html` — open it in a browser (serve it over `python3 -m http.server`; Playwright blocks `file:`). Where this document and the prototype disagree on behavior, this document wins; where they disagree on visual detail, the prototype wins.

The prototype is HTML. It is a reference, not code to port: the real app keeps React, react-hook-form, shadcn/ui, Tailwind v3, dnd-kit and the existing tokens in `src/styles/app.css`.

## Scope

In scope: the six tabs of the editor and the shell around them. Out of scope: any new route (CLAUDE.md §8 allows one `/dashboard` and the existing edit route), the group editor (`ServiceGroupApplicationPage`) except where it shares `FormTemplateBuilder`, payments, notifications, anything in CLAUDE.md §6.

## What already exists (do not rebuild)

`ServiceFormPage` already has: the tab bar with per-tab counts and an alert icon on tabs with errors, the error summary with jump-to-field links (`FIELD_ERROR_DESTINATIONS`, `focusErrorDestination`), Previous/Next navigation, `variantOnly` mode (hides `case-questions` and `application-form`), a single global save, the leave-guard `AlertDialog`, hash-based tab selection (`timing-routing` alias), and the dirty indicator in `ServiceFormActionBar`. The anchors `service-code`, `service-name`, `service-classification`, `service-fee`, `fee-breakdown-heading`, `service-processing-time`, `service-department`, `client-steps-heading`, `person-roles-heading`, `requirements`, `service-display-group`, `service-display-name`, `service-requirement-group` are used by the error summary and must keep resolving.

## Decisions by tab

### Shell
- Workspace content width about 920px (today `max-w-5xl`).
- Per-tab counts stay; on narrow widths show the count only on the active tab. Alert icon on tabs with errors is unchanged.
- Everything else in the shell is kept as is.

### Registry & Fees
- Settings-row layout: label and help text on the left, control on the right, grouped under two headers, **Service** and **Fees & Processing**. On phones the rows stack.
- "Allow multiple copies" is a full-width switch row.
- **Fee breakdown is a compact table.** Columns: Charge | Amount | Charged | In total | When it applies.
  - *Charged* is a select: Flat (default) / per page / per copy / per document. *When it applies* is an optional short note (max 120 chars).
  - For rows marked **In total**, *Charged* and *When it applies* are disabled and ignored on save: an included row is a fixed part of the total.
  - Footer: "Included total ₱X" with a status chip — **Matches**, **₱X short**, or **₱X over** — and, on mismatch, a bar "Set Total Fee to ₱X" that writes the included total into the Total Fee field.
  - Below the table, "What applicants see": a receipt-style preview of the included lines and the "also payable" lines, with unit and note.
- Data: `FeeComponent` gains optional `unit` (`page | copy | document`) and `note` (string). No database change: `fee_components_are_valid` inspects only `label`, `amount` and `included`, and the column is `jsonb`. Old rows without the new keys must keep working everywhere. The column comment is updated by a migration for documentation only.

### Citizen Journey
- Steps are numbered rows with Duplicate and Remove; Remove shows an Undo toast.
- Person roles stay a list with add/remove.
- "Allow messages on requests" is a full-width switch row (label left, switch right, no squeezed text).
- Not modeled and not added: per-step duration or cashier names from the charter.

### Timing & Routing
- Sentence layout: "When **[trigger date ▾]** falls **[outside/inside ▾]** the **[30]-day** on-time window. Days are counted in **[timezone]**." then "Then **[response ▾]**".
- The Alternate Track select is hidden for the responses that do not route (Warn only, Block entry) and shows a same-service warning when the target is this service.
- Require-document switch and the alert title / button label / description fields stay, with a live applicant preview.
- Trigger options are the Application Form's date fields. If there are none, "Add Window Rule" stays disabled with the existing message.
- The timeline strip from the prototypes is deliberately **not** built.

### Application Form
- Table columns: grip | Question (type-icon tile, label, "Shared · <block>" subline) | Key (mono) | Type chip | Required (soft pill, or "Optional") | Visibility ("Always shown" / "Shown when …") | "…" menu (Edit, Move Up, Move Down, Duplicate, Remove).
- **No clickable `<tr>`** (tempertemper: clickable table rows are a bad idea). The first cell is one real `<button>` that opens the field sheet, with a visible focus ring and a hover underline on the label. After the sheet closes, focus returns to that button.
- Reordering keeps dnd-kit (pointer from the grip only; keyboard sensor on the grip; Move Up/Down in the menu as the non-drag route).
- Field sheet: Label, Stable Field Key (locked once published: "Locked because this key exists in a published version."), Field Type, Placeholder, Dropdown Options, "Applicant must answer this field", Show When.
- **Dropdown Options editor** — Value | Label | remove, plus Add Option.
  - A condition stores the option **value**, never the label (already true in `visibleWhen`, `caseSelector` and requirement `applies_when`). Summaries derive the label from the value, so renaming a label is safe.
  - An option used by any condition (another field's `visibleWhen`, a case-selector outcome, or a requirement's `applies_when`) has a **locked value** and cannot be removed; the row says what uses it.
  - A value is auto-derived from the label only for options added in this editor and only until the admin edits the value by hand; never for an option that is in use.
  - Removing an unused option shows an Undo toast.
- `FormTemplateBuilder` is shared with `FormBlocksPage`; every change must work there too.

### Requirements (two-line table)
- Group tabs with counts: **All / This variant / Conditional / Shared / Other**; default tab **Conditional** when it has rows, else All. Search looks across all groups.
- Columns: Requirement | Applies to | Required.
  - *Requirement*: bold title (text before the first comma) with the rest muted beneath. A "No file" tag only when the row does not require an upload.
  - *Applies to*: one line — a blue condition chip (e.g. "Age 18–20", "Exempt from license", "Not X") and a grey person chip (e.g. "Bride"). Only a person → only that chip. Neither → "Everyone". Chip logic = prototype functions `shortOne`, `whenShort`, `whoOf`: at most two conditions joined with " + " (match all) or " or " (match any), otherwise first condition plus "+N"; person chip comes from `upload_scope = specific_subject` (the role) or "Each person" for `each_subject`.
  - *Required*: a quiet check mark, or an amber "Optional" pill, then an always-visible muted "…" menu: Configure / Override for this variant / Remove.
- First cell is one real button opening the Configure sheet; no row-level click handler; no `role` on rows.
- Shared (inherited / other) rows are locked: static text and a lock icon, not buttons, until **Unlock to Edit** is pressed on the Shared tab.
- One **Add** menu: Add Requirement / Add Variant-Specific (disabled with a hint when the form has no routing).
- Remove shows an Undo toast that restores the row at its old position. Discarding a brand-new, never-confirmed row removes it instead of leaving "Untitled requirement".
- **Configure sheet** keeps its content: Title, Where to Secure, a **Required switch**, an upload switch with Who Must Upload (once per request / every person / one specific person) and Which Person buttons, and the "When It Applies" builder with the green "What applicants see" box and the legacy case-tag note.

### Relationships
- The four fields shown directly: Display Group (mono), Display Name, Short Name (40-character counter), Requirement Group (mono), plus a chip: "Standalone" or "N links".

## Accessibility and UX rules (apply everywhere)
- Real buttons for anything clickable; never a clickable `<tr>`.
- Visible focus ring on every interactive element; targets at least 44px tall where the existing inputs are.
- Destructive actions use an Undo toast or inline confirmation, not a blocking dialog.
- Focus returns to the originating control when a sheet closes.
- Works in light and dark themes using the existing tokens; no new colors.
- The user reviews the app in **Safari**; layout must be checked in WebKit, not only Chromium.

## Open decisions (defaults used by the plan)
1. **Font:** the prototype used Geist; the app uses Helvetica Neue. Default: keep the app font. No dependency added.
2. **Test runner:** the repo has none. Default: add `vitest` as a dev dependency, used only for pure helpers (CLAUDE.md lists the stack as fixed, so this needs the owner's OK).
