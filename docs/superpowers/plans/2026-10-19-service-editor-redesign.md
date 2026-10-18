# Service Editor Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the approved redesign of the admin Edit Service screen into the real app, tab by tab, without changing what an admin can configure or how a service is saved.

**Architecture:** Refine the existing `ServiceFormPage` shell and its six section components in place; no new routes and no new save path. Logic that carries a rule (fee status, option usage, requirement chips) goes into small pure modules with unit tests; the UI components stay thin and are verified in a browser. `FormTemplateBuilder` is shared with the shared-blocks editor, so its changes are backward compatible.

**Tech Stack:** React 18, TanStack Start/Router, Tailwind v3, shadcn/ui (Base-UI-style `Select`/`Sheet`/`Collapsible`), react-hook-form, zod, dnd-kit, sonner, Supabase. Tests: `vitest` (pure helpers only — see Task 1).

**Spec:** `docs/superpowers/specs/2026-10-19-service-editor-redesign-design.md` (visual reference: `docs/superpowers/specs/assets/2026-10-19-service-editor-prototype.html`)

## Global Constraints

- Stack is fixed (CLAUDE.md §3). The only addition proposed is `vitest` as a dev dependency (Task 1, needs the owner's OK). No new runtime dependency, no new font.
- No new route files (CLAUDE.md §8). The edit route `services_.$serviceCode.edit.tsx` keeps its loader and props to `ServiceFormPage` unchanged.
- Nothing from CLAUDE.md §6 is built: no payment integration, no AI validation, no SMS, no offline mode, no external-database integration, no multi-LGU, no advanced analytics.
- Four workflow stages and the status vocabulary are not touched.
- Error-summary anchors must keep resolving: `service-code`, `service-name`, `service-classification`, `service-fee`, `fee-breakdown-heading`, `service-processing-time`, `service-department`, `client-steps-heading`, `person-roles-heading`, `requirements`, `service-display-group`, `service-display-name`, `service-requirement-group`.
- Tab ids stay `registry-details`, `citizen-journey`, `case-questions`, `application-form`, `requirements`, `relationships`; hash `timing-routing` still opens `case-questions`; `variantOnly` still hides `case-questions` and `application-form`.
- A condition stores an option **value**, never its label.
- No clickable `<tr>`, no `role` on table rows; the first cell holds one real `<button>`; locked rows are not buttons.
- Use existing design tokens only (`bg-primary-soft`, `text-muted-foreground`, `bg-surface-subtle`, `tone-*` …); light and dark must both work. Inputs stay at their current height.
- Fee `unit` values: `page`, `copy`, `document`; absent means Flat. `note` max 120 characters. Rows marked In total never carry a unit or note.
- User copy uses sentence-case labels as written in the spec: "Set Total Fee to ₱X", "Unlock to Edit", "Add Variant-Specific", "Insert Shared Block", "Add Field".
- Commit only the files each task names (`git add <paths>`); the working tree has an unrelated untracked `src/components/ui/attachment.tsx`.
- Verification commands: types `npx tsc --noEmit`; lint `npx eslint <paths>`; tests `npx vitest run <file>`; app `npm run dev`. Browser checks use the Playwright MCP against the dev server signed in as an admin, at 1280px and 390px, in light and dark, and (because the owner uses Safari) in WebKit if the tool can launch it.

## Review Focus

- Renaming a dropdown option's **label** must not change what a condition matches (value-based conditions) — pinned in Task 8.
- An option used by a condition must not be removable or have its value edited, and the editor says what uses it — Task 8.
- A service saved before this change (fee components without `unit`/`note`) must load, validate and save unchanged — Task 3.
- Keyboard-only use: open a field/requirement from its first cell, close the sheet with Esc and land back on the same button; reorder via Move Up/Down — Tasks 7 and 10.
- A shared service group: inherited rows stay locked (not focusable buttons) until Unlock to Edit; Override creates a row scoped to this variant only — Task 10.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `vitest.config.ts`, `package.json` | Test runner for pure helpers (Task 1) |
| `src/features/services/fee-components.ts` (+ `.test.ts`) | `FeeComponent` with `unit`/`note`; fee status and unit labels |
| `src/features/admin/services/components/service-form.config.ts` | Form schema/payload for the new fee fields |
| `.../service-form-sections/RegistryDetailsSection.tsx` | Settings-row layout |
| `.../service-form-sections/FeeBreakdownFields.tsx` | Compact fee table, status footer, fix bar, receipt |
| `src/features/apply/components/ApplicationDocket.tsx` | Show unit and note on "also payable" lines |
| `.../service-form-sections/CitizenJourneySection.tsx` | Numbered steps, Undo, switch row |
| `.../service-form-sections/EventTimingSection.tsx` | Sentence layout |
| `src/features/forms/components/FormTemplateBuilder.tsx` | Field table: first-cell button, no row click, Duplicate |
| `src/features/forms/form-option-usage.ts` (+ `.test.ts`) | Which conditions use a dropdown option; value derivation |
| `src/features/forms/components/FormFieldInspector.tsx` | Options editor with locks and Undo |
| `.../components/requirement-chips.ts` (+ `.test.ts`) | Title split, Applies-to chips, tab filtering |
| `.../service-form-sections/RequirementsTable.tsx` (new) | Group tabs, search, table, Add menu |
| `.../service-form-sections/RequirementSheet.tsx` (new, extracted from `RequirementRow.tsx`) | Configure sheet |
| `.../service-form-sections/RequirementsSection.tsx` | Orchestration, lock state, Undo, Override |
| `.../service-form-sections/RelationshipsSection.tsx` | Direct fields + chip |
| `.../components/ServiceFormPage.tsx` | Width, count collapse, pass-through props |

---

### Task 1: Test runner for pure helpers

Needs the owner's OK to add a dev dependency (CLAUDE.md lists the stack as fixed). If declined, skip the test steps in Tasks 3, 8, 9 and rely on `tsc` plus the browser checks; keep the helpers pure anyway.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `npx vitest run <file>` works for `src/**/*.test.ts`, with the `~/` alias resolving to `src/`.

- [ ] **Step 1: Install** `vitest` as a dev dependency (`npm i -D vitest`). Add script `"test": "vitest run"`.
- [ ] **Step 2: Create `vitest.config.ts`** with `test.environment = "node"`, `include: ["src/**/*.test.ts"]`, and `resolve.alias` mapping `~` to `./src` (copy the alias from `tsconfig.json`).
- [ ] **Step 3: Smoke test** — create `src/features/services/fee-components.test.ts` containing one test `it("includedFeeTotal adds in cents", …)` asserting `includedFeeTotal([{label:"a",amount:0.1,included:true},{label:"b",amount:0.2,included:true}]) === 0.3`. Run `npx vitest run src/features/services/fee-components.test.ts`. Expected: PASS.
- [ ] **Step 4: Commit** `git add package.json package-lock.json vitest.config.ts src/features/services/fee-components.test.ts` — `chore: add vitest for pure helpers`.

---

### Task 2: Registry & Fees — settings-row layout

**Files:**
- Modify: `src/features/admin/services/components/service-form-sections/RegistryDetailsSection.tsx`

**Interfaces:**
- Consumes: existing `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `Switch`; the form fields `name`, `service_code`, `fee`, `fee_per_copy`, `classification`, `processing_time`, `department_id`.
- Produces: unchanged component API. Element ids unchanged (`service-name`, `service-code`, `service-fee`, `service-classification`, `service-processing-time`, `service-department`).

- [ ] **Step 1: Add a local `SettingRow` component** (same file) taking `label`, `htmlFor`, `help?`, `error?`, `children` — renders label + help in the left column and the control in the right at `sm` and up (about 40/60), stacked below `sm`. Add a `SettingGroup` with a small uppercase header ("Service", "Fees & Processing") and a divided list.
- [ ] **Step 2: Rebuild the body** so Start-From-Service (create mode only), Service Name, Service Code fall under **Service**; Total Fee (label "Fee per Copy" when `fee_per_copy`), Allow multiple copies, Classification, Processing Time, Handling Department fall under **Fees & Processing**, with `<FeeBreakdownFields />` after them. "Allow multiple copies" is a full-width row: label and help left, `Switch` right, no wrapping into the switch. Keep every `Controller`, validation message and `aria-invalid` as today.
- [ ] **Step 3: Verify** — `npx tsc --noEmit` and `npx eslint` on the file pass. In the browser open an existing service's edit page, tab Registry & Fees: rows align, long help text wraps without touching the control, 390px stacks cleanly, trigger a validation error (clear Service Name, Save) and confirm the error summary link focuses `service-name`.
- [ ] **Step 4: Commit** — `feat(services): settings-row layout for Registry & Fees`.

---

### Task 3: Fee component model — `unit` and `note`

**Files:**
- Modify: `src/features/services/fee-components.ts`, `src/features/admin/services/components/service-form.config.ts`, `src/features/apply/components/ApplicationDocket.tsx`
- Create: `supabase/migrations/20261019120000_fee_component_unit_note_doc.sql` (comment only)
- Test: `src/features/services/fee-components.test.ts`

**Interfaces:**
- Produces (in `fee-components.ts`):
  - `type FeeUnit = "page" | "copy" | "document"`
  - `FeeComponent` gains `unit?: FeeUnit` and `note?: string`; `feeComponentSchema` accepts both (`unit` falls back to `undefined` on an unknown value, `note` trimmed, max 120).
  - `type FeeTotalState = "none" | "match" | "short" | "over"`
  - `feeTotalStatus(components: readonly FeeComponent[], fee: number): { state: FeeTotalState; includedTotal: number; difference: number }` — `difference` is `fee − includedTotal` in pesos (positive when short); `state` is `"none"` when no row is included.
  - `feeUnitLabel(unit: FeeUnit | undefined): string` → `"Flat" | "per page" | "per copy" | "per document"`.
  - `describeAlsoPayable(component: FeeComponent): string` → e.g. `"₱5.00 per page — only if certified by the LCR"`; omits the unit for Flat and the dash part when there is no note.
- Produces (in `service-form.config.ts`): form row type gains `unit: "" | FeeUnit` and `note: string`; `toFeeComponentPayload` emits `unit`/`note` only for rows with `included === false` and non-empty values, and never for included rows.

- [ ] **Step 1: Write failing tests** in `fee-components.test.ts`:
  - `feeTotalStatus` → `{state:"match", difference:0}` when `0.1+0.2` is included and fee is `0.3`; `short` with `difference` `50` when included total is 100 and fee is 150; `over` with `difference` `-50` for the reverse; `none` with no included row.
  - `parseFeeComponents([{label:"x",amount:5,included:false,unit:"page",note:"n"}])` keeps `unit` and `note`; an entry with `unit:"bogus"` keeps the entry with `unit` undefined; an entry with neither key (old data) parses unchanged.
  - `feeUnitLabel(undefined) === "Flat"`, `feeUnitLabel("copy") === "per copy"`.
  - `describeAlsoPayable({label:"Certified copy",amount:5,included:false,unit:"page",note:"by the LCR"})` equals `"₱5.00 per page — by the LCR"`.
  - Payload (export `toFeeComponentPayload` is in config): included row with `unit:"page"` → output has no `unit`.
- [ ] **Step 2: Run** `npx vitest run src/features/services/fee-components.test.ts` — expect FAIL (missing exports).
- [ ] **Step 3: Implement** the interfaces above in `fee-components.ts`; reuse the existing cents helpers. Extend `feeComponentFormSchema`, `serviceFormDefaults` (map `unit ?? ""`, `note ?? ""`) and `toFeeComponentPayload` in `service-form.config.ts`. Reuse `feeComponentsIssue` untouched.
- [ ] **Step 4: ApplicationDocket** — where "also payable" lines are rendered, show `describeAlsoPayable(component)` instead of the bare label + amount. Read how it renders today first and keep its markup; only the text changes.
- [ ] **Step 5: Migration** — a single `comment on column public.services_registry.fee_components is '…'` updating the documented shape to `[{label, amount, included, unit?, note?}]`. No constraint change (the validator ignores extra keys). Do not apply it to the remote project without the owner's go-ahead.
- [ ] **Step 6: Run** the tests (PASS) and `npx tsc --noEmit` (PASS).
- [ ] **Step 7: Commit** — `feat(fees): optional unit and note on fee components`.

---

### Task 4: Fee breakdown table, status footer and receipt

**Files:**
- Modify: `src/features/admin/services/components/service-form-sections/FeeBreakdownFields.tsx`

**Interfaces:**
- Consumes: `feeTotalStatus`, `feeUnitLabel`, `describeAlsoPayable`, `splitFeeComponents` from Task 3; form fields `fee_components.N.{label,amount,unit,note,included}` and `fee`.
- Produces: `FeeBreakdownFields()` — same export and `fee-breakdown-heading` id.

- [ ] **Step 1: Table columns** Charge | Amount | Charged | In total | When it applies | remove. *Charged* is a `Select` (Flat, per page, per copy, per document → stored `""`, `page`, `copy`, `document`); *When it applies* is an `Input` (`maxLength={120}`). Both are `disabled` while the row's In-total checkbox is checked, with muted styling. Checking In total clears that row's `unit` and `note`. Keep the Collapsible, its open-when-has-rows behaviour and the force-open on submit error.
- [ ] **Step 2: Footer** — "Included total ₱X" plus a chip from `feeTotalStatus`: `match` → "Matches" (success tone), `short` → "₱X short" and `over` → "₱X over" (destructive tone). On `short`/`over` show a bar with a button "Set Total Fee to ₱X" that calls `form.setValue("fee", String(includedTotal), { shouldDirty: true, shouldValidate: true })`. Keep the existing `role="alert"` issue text.
- [ ] **Step 3: "What Applicants See"** below the table when there is at least one row: included lines with amounts, then an "Also payable" list using `describeAlsoPayable`. Hidden while `fee_per_copy` is on (the breakdown is hidden in that mode today — preserve whatever the current behaviour is).
- [ ] **Step 4: Verify** — `npx tsc --noEmit`, `npx eslint` on the file. Browser: open a seeded service with a breakdown (for example the marriage service); change an amount and see the chip go to "short", press the fix bar and see Total Fee update and the chip return to "Matches"; set an unchecked row to per page with a note and see the receipt; Save, reload, confirm unit/note persisted; open an old service (no unit/note) and confirm it loads and saves without a DB error.
- [ ] **Step 5: Commit** — `feat(services): compact fee table with unit, note and total status`.

---

### Task 5: Citizen Journey — numbered steps, Undo, switch row

**Files:**
- Modify: `src/features/admin/services/components/service-form-sections/CitizenJourneySection.tsx`

**Interfaces:**
- Consumes: `useFieldArray` for `steps` and `party_roles`; ids `client-steps-heading`, `person-roles-heading`, `service-allows-messages` are kept.

- [ ] **Step 1: Steps** as numbered rows (number badge, textarea/input as today, placeholder hints `STEP_PLACEHOLDERS` kept), with Duplicate (inserts a copy after the row, already partly present at the `insert` call) and Remove. Remove shows a sonner toast with an **Undo** action that re-inserts the removed value at the same index (clamped to the current length) — follow the pattern used by `removeRequirement` in `RequirementsSection.tsx`.
- [ ] **Step 2: Messages** — "Allow messages on requests" as a full-width row: label and help text left, `Switch` right (`id="service-allows-messages"`); the text must not wrap into or under the switch at 390px.
- [ ] **Step 3: Verify** — `npx tsc --noEmit`, lint. Browser: remove a middle step, press Undo, the step returns in place; duplicate; add; 390px shows no overlap on the messages row.
- [ ] **Step 4: Commit** — `feat(services): numbered journey steps with undo and a full-width messages row`.

---

### Task 6: Timing & Routing — sentence layout

**Files:**
- Modify: `src/features/admin/services/components/service-form-sections/EventTimingSection.tsx`

**Interfaces:**
- Consumes: existing `timing` object and `updateTiming`, `TIMING_BEHAVIORS`, `TIMING_MISMATCHES`, `caseDateFields`, `targetOptions`, drafts for days and timezone. These exports and the `timing-routing` id are kept.

- [ ] **Step 1: Replace the three-column grid** with the sentence "When [trigger date select] falls [outside/inside select, bound to `mismatch`] the [days input]-day on-time window. Days are counted in [timezone input]." and a second line "Then [behavior select, `TIMING_BEHAVIORS`]". Controls are inline on `sm` and up and wrap on phones; each keeps a programmatic label (`aria-label` or visually hidden label) and its current `id`. Keep the days and timezone drafts and the invalid-timezone `FieldError`.
- [ ] **Step 2: Alternate track** — show the Alternate Service Track select only for behaviors that route (`redirect_confirm`, `auto_route`); hide it for `warn_allow` and `block`. When the chosen target is the current service, show a warning that the rule would route to itself. Saving still requires a valid target for routing behaviors (that check lives in `ServiceFormPage.onSubmit` and is not changed).
- [ ] **Step 3: Keep** the require-document switch, alert title, button label and description fields and the applicant-facing preview; no timeline strip. Add Window Rule disabled with the existing message when there are no date fields; Remove with Undo is unchanged.
- [ ] **Step 4: Verify** — `npx tsc --noEmit`, lint. Browser: a service with a window rule: flip each behavior and confirm the track select appears/disappears; save and reload to confirm values round-trip; a service with no date field shows the disabled button and message; 390px wraps.
- [ ] **Step 5: Commit** — `feat(services): sentence layout for registration window rules`.

---

### Task 7: Application Form table — first-cell button, no row click, Duplicate

**Files:**
- Modify: `src/features/forms/components/FormTemplateBuilder.tsx`

**Interfaces:**
- Consumes: `FormTemplateBuilder` props unchanged (`definition`, `onChange`, `immutableKeys`, `steps`, `allowPersonGroup`, `allowSharedBlocks`); `selected` state and `FormFieldInspector`.
- Produces: `FieldRow` takes a new `onDuplicate: () => void`; `StepFieldTable` passes it; `duplicateField(step, index)` added to the builder (inserts a copy after the row with a new key from `nextFieldKey`, label suffixed " (copy)", `blockKey` removed, not for `person_group`).

- [ ] **Step 1: Remove the row click** — delete `onClick={onOpen}` and `cursor-pointer` on `TableRow`, and the two `stopPropagation` wrappers that only existed for it.
- [ ] **Step 2: First cell is one `<button type="button">`** containing the type-icon tile, the label and the "Shared · name" subline, with `aria-current` when selected, a visible `focus-visible` ring and `hover:underline` on the label; it calls `onOpen`. The existing `Button variant="link"` label becomes this button's text (do not nest buttons).
- [ ] **Step 3: Focus return** — keep a ref to the button that opened the sheet; on `FormFieldInspector` close, call `.focus()` on it after the sheet's own focus restoration (check what `Sheet` already restores before adding code; if it already returns focus to the trigger, only make sure the opener is a stable element and add no code).
- [ ] **Step 4: Menu** — add **Duplicate** between Move Down and Remove (disabled when `locked` or type `person_group`). Required column keeps the soft pill / "Optional"; Visibility keeps "Always shown" / "Only if …" wording changed to "Shown when …", and the misordered warning unchanged.
- [ ] **Step 5: Drag** — keep dnd-kit as is (grip is the only activator). Confirm in the browser that dragging from the label does not start a drag.
- [ ] **Step 6: Verify** — `npx tsc --noEmit`, lint. Browser: Tab to a row's first cell, Enter opens the sheet, Esc closes and focus is on that button; click on empty row space does nothing; Move Up/Down and Duplicate work; drag by the grip reorders; then open the shared-blocks editor (`FormBlocksPage`) and confirm it still renders and edits.
- [ ] **Step 7: Commit** — `feat(forms): field table opens from a real button and gains Duplicate`.

---

### Task 8: Dropdown options — usage locks, Undo, derived values

**Files:**
- Create: `src/features/forms/form-option-usage.ts`
- Modify: `src/features/forms/components/FormFieldInspector.tsx`, `src/features/forms/components/FormTemplateBuilder.tsx` (pass the new prop), `src/features/admin/services/components/ServiceFormPage.tsx` and `.../ApplicationFormSection.tsx` (pass requirement conditions through)
- Test: `src/features/forms/form-option-usage.test.ts`

**Interfaces:**
- Produces:
  - `optionUsage(definition: FormTemplateDefinition, fieldKey: string, value: string, extra?: readonly ConditionRef[]): string[]` where `type ConditionRef = { field: string; value: string; where: string }`. Returns human descriptions (for example `"Shown when this is chosen — Marriage license number"`, `"Routes to MARRIAGE-LATE"`, plus each `extra.where`) for every condition across `visibleWhen` of any field, `caseSelector` outcomes, and `extra` that references `fieldKey` with `value`. Empty array means unused.
  - `deriveOptionValue(label: string, taken: ReadonlySet<string>): string` — lowercase, non-alphanumerics → `_`, trimmed of leading/trailing `_`, never empty (`option`), suffixed `_2`, `_3` … when taken.
  - `FormTemplateBuilder` gains optional prop `externalConditions?: readonly ConditionRef[]` forwarded to `FormFieldInspector`.
  - `ApplicationFormSection` gains optional `externalConditions` and `ServiceFormPage` fills it from the requirements' `applies_when` (each condition → `{field, value, where: "Requirement: <name>"}`).

- [ ] **Step 1: Write failing tests** in `form-option-usage.test.ts`:
  - A field B with `visibleWhen {field:"nationality", operator:"equals", value:"foreign"}`: `optionUsage(def, "nationality", "foreign")` has length 1; `optionUsage(def, "nationality", "filipino")` is `[]`.
  - Renaming the label of option `foreign` in the definition does not change `optionUsage(…, "foreign")` (usage is by value).
  - A `caseSelector` outcome condition and an `extra` ref each count.
  - `deriveOptionValue("Foreign national", new Set()) === "foreign_national"`; with `"foreign_national"` taken → `"foreign_national_2"`; `deriveOptionValue("  !! ", new Set()) === "option"`.
- [ ] **Step 2: Run** `npx vitest run src/features/forms/form-option-usage.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `form-option-usage.ts` (pure, no React imports).
- [ ] **Step 4: Options editor** in `FieldEditor` (`FormFieldInspector.tsx`): rows are Value (mono) | Label | remove. A row with non-empty `optionUsage` has its Value input `disabled`, its remove button `disabled`, and a muted line "Used by: …". New options added with **Add Option** start with `autoValue` tracked in local state keyed by row index: while the admin has not touched Value, typing the Label updates Value via `deriveOptionValue`; touching Value stops that. Never re-derive for an option that is in use or that came from saved data. Removing an unused option shows a sonner toast with **Undo** restoring it at the same index through `onUpdate`.
- [ ] **Step 5: Verify** — tests PASS; `npx tsc --noEmit`; lint. Browser: in a service whose requirement condition uses an option, open that dropdown field: the used option is locked with its usage line; rename its label and confirm the requirement chip still shows the (new) label; add a new option and watch its value follow the label; remove it and Undo.
- [ ] **Step 6: Commit** — `feat(forms): protect dropdown options used by conditions`.

---

### Task 9: Requirements helpers (pure)

**Files:**
- Create: `src/features/admin/services/components/requirement-chips.ts`
- Test: `src/features/admin/services/components/requirement-chips.test.ts`

**Interfaces:**
- Consumes: `ConditionSource` (`~/features/forms/components/ConditionRuleBuilder`), `ConditionRule` (`~/features/forms/form-template.types`), `RequirementScopeKind` (`./requirement-scope`).
- Produces:
  - `splitRequirementTitle(name: string): { title: string; detail: string | null }` — text before the first comma is the title, the rest (trimmed) the detail; no comma → `detail: null`; empty name → `title: "Untitled requirement"`.
  - `requirementChips(input: { appliesWhen: ConditionRule | null; uploadScope: "request" | "each_subject" | "specific_subject"; subjectRole: string | null }, sources: readonly ConditionSource[]): { condition: string | null; person: string | null }`
  - `type RequirementTab = "all" | RequirementScopeKind`
  - `filterRequirements<T extends { scopeKind: RequirementScopeKind; searchText: string }>(entries: readonly T[], tab: RequirementTab, query: string): T[]` — when `query` is non-empty it ignores `tab` (search spans all groups).
  - `defaultRequirementTab(counts: Record<RequirementScopeKind, number>): RequirementTab` → `"conditional"` when it has rows, else `"all"`.
- Behavior source for chips is the prototype's `shortOne`, `whenShort`, `whoOf`: option **label** looked up by value; a source whose label ends in "age" renders "Age " + label without a trailing " years old"; `not_equals` renders "Not " + label; two or fewer conditions are joined with " + " (match all) or " or " (match any); more than two render the first plus " +N"; `specific_subject` → the role; `each_subject` → "Each person"; `request` → `null`.

- [ ] **Step 1: Write failing tests** covering: title split (comma, no comma, empty); a single `equals` condition renders the label of its option value (and still renders when the label has been renamed); an age-source condition renders "Age 18–20"; `not_equals` → "Not Filipino"; three conditions → "A +2"; `match:"any"` joins with " or "; person chip for each upload scope; both null → both `null`; `filterRequirements` with a query returns matches from every kind; `defaultRequirementTab({conditional:0,…})` is `"all"` and with conditional rows is `"conditional"`.
- [ ] **Step 2: Run** `npx vitest run src/features/admin/services/components/requirement-chips.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** the functions (pure; no React).
- [ ] **Step 4: Run** the tests — PASS; `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `feat(services): pure helpers for the requirements table`.

---

### Task 10: Requirements table

**Files:**
- Create: `src/features/admin/services/components/service-form-sections/RequirementsTable.tsx`
- Modify: `src/features/admin/services/components/service-form-sections/RequirementsSection.tsx`

**Interfaces:**
- Consumes: Task 9 helpers; `classifyRequirementScope`, `summarizeCondition`; `Table` components; `DropdownMenu`; `Tabs` (or a roving-tabindex radio group if `Tabs` cannot express counts cleanly); the existing section props (`isLoading`, `sharedWith`, `formDefinition`, `currentServiceCode`, `variantCodes`, `embedded`).
- Produces:
  - `RequirementsTable` props: `entries: RequirementEntry[]` (the type already in `RequirementsSection.tsx`, exported), `locked(kind): boolean`, `onOpen(index: number, opener: HTMLElement): void`, `onOverride?(index): void`, `onRemove(index): void`, `conditionSources`.
  - `RequirementsSection` keeps owning: the field array, `inheritedUnlocked`, Undo on remove (`removeRequirement`), `overrideRequirement`, `addBlank`, `addVariantSpecific`, and the single piece of "which row's sheet is open" state (`openIndex: number | null`).

- [ ] **Step 1: Layout** — header row: search input; group tabs **All / This variant / Conditional / Shared / Other** with counts ("Shared" = kind `inherited`, "Other" = kind `other`; hide the Other tab when it has zero rows); one **Add** menu with Add Requirement and Add Variant-Specific (disabled with the existing hint when `!formDefinition.caseSelector`). The shared-checklist warning `Alert` and the loading/empty states stay.
- [ ] **Step 2: Table** — columns Requirement | Applies to | Required. Requirement cell: one `<button type="button">` holding the bold title and muted detail (and a "No file" tag when `requires_upload` is false), with focus ring and hover underline, calling `onOpen`. Applies-to cell: blue condition chip + grey person chip, or "Everyone". Required cell: a check icon with `sr-only` "Required", or an amber "Optional" pill, then the "…" menu trigger (`aria-label="Actions for <title>"`) with Configure, Override for this variant (only for Shared rows and only when `onOverride` exists), Remove. No `onClick` on rows, no row `role`.
- [ ] **Step 3: Locked rows** — for kinds `inherited`/`other` while `groupLocked(kind)`: the first cell is a non-interactive element (no button, not focusable), a lock icon with an accessible name replaces the menu, and the Shared tab shows an **Unlock to Edit** / **Lock** button plus the existing explanatory line. Override stays available while locked.
- [ ] **Step 4: Behaviors** — default tab from `defaultRequirementTab` on first render with data; search spans all groups and shows "Showing N of M requirements."; adding a plain requirement switches to the Shared tab and unlocks it (as `addBlank` does today), adding a variant-specific one switches to This variant; the new row's sheet opens automatically.
- [ ] **Step 5: Verify** — `npx tsc --noEmit`, lint. Browser (use a grouped service with routing, e.g. a marriage-license variant): tab counts add up; Conditional is the default; a locked Shared row cannot be tabbed into; Unlock to Edit makes it a button; Override creates a row under This variant; Remove then Undo restores the row at the same position; 390px scrolls the table inside its wrapper without page overflow.
- [ ] **Step 6: Commit** — `feat(services): two-line requirements table with group tabs`.

---

### Task 11: Requirement Configure sheet

**Files:**
- Create: `src/features/admin/services/components/service-form-sections/RequirementSheet.tsx`
- Modify: `src/features/admin/services/components/service-form-sections/RequirementRow.tsx` (reduce to the sheet, or delete it and its imports once `RequirementSheet` replaces it), `.../RequirementsSection.tsx`

**Interfaces:**
- Produces: `RequirementSheet` props `{ index: number; open: boolean; onOpenChange(open: boolean): void; isNew: boolean; onDiscardNew(): void; conditionSources: ConditionSource[]; partyRoles: string[] }`. `RequirementValue` type stays exported (from this file or `RequirementRow.tsx`; keep one export path and update imports).

- [ ] **Step 1: Extract** the `SheetContent` of `RequirementRow` into `RequirementSheet` (rendered once by `RequirementsSection` for `openIndex`), keeping the fields: Title, Where to Secure, upload switch, Who Must Upload, Which Person, When It Applies (`ConditionRuleBuilder`, green "What applicants see" alert, legacy case-tag note), and the footer buttons **Discard Changes** / **Done**. Snapshot-on-open and revert-on-discard behavior stays as in `RequirementRow` (`initialValueRef`).
- [ ] **Step 2: Required as a switch** — replace the Required / If applicable toggle group with a `Switch` row labelled "Required", bound to `is_mandatory`.
- [ ] **Step 3: Who Must Upload as buttons** — three buttons in a `ToggleGroup` (Once per request / Every person / One specific person) instead of the select; Which Person unchanged (buttons up to 4 roles, select above).
- [ ] **Step 4: New rows** — when `isNew` and the admin chooses Discard Changes, call `onDiscardNew()` which removes the row (no Undo toast, nothing was confirmed) instead of reverting to a blank "Untitled requirement".
- [ ] **Step 5: Focus return** — closing the sheet (Esc, X, Done, Discard) focuses the originating button from `onOpen(index, opener)`; if the originating row no longer exists (discarded new row), focus the table's Add button.
- [ ] **Step 6: Verify** — `npx tsc --noEmit`, lint. Browser: open from the title button, edit Title, Done — the table row updates; Discard reverts; add a new requirement, Discard — the row is gone; Esc returns focus to the title button; validation error for a blank title still shows in the sheet and the error summary link for `requirements` still works.
- [ ] **Step 7: Commit** — `feat(services): requirement sheet with switch and button groups`.

---

### Task 12: Relationships and shell polish

**Files:**
- Modify: `src/features/admin/services/components/service-form-sections/RelationshipsSection.tsx`, `src/features/admin/services/components/ServiceFormPage.tsx`

**Interfaces:**
- Consumes: form fields `display_group`, `display_name`, `short_name` (maxLength 40), `requirement_group`; ids `service-display-group`, `service-display-name`, `service-short-name`, `service-requirement-group`.

- [ ] **Step 1: Relationships** — the four fields visible directly (no collapsible gate, if one exists today), Display Group and Requirement Group in mono, a live "N / 40" counter on Short Name, and a chip at the top: "Standalone" when neither group is set, else "N links" (count of non-empty group fields, matching `relationshipsSummary`).
- [ ] **Step 2: Width** — change the workspace container from `max-w-5xl` to a max width of about 920px (`max-w-[920px]`).
- [ ] **Step 3: Tab counts** — keep counts on all tabs when they fit; otherwise only on the active tab. Implement with CSS (`sm:inline` → count shown only on the active trigger below a width breakpoint using `group-data-[active]` / the `data-active` attribute already used by `tabListRef`), not with measurement code, unless CSS cannot express it.
- [ ] **Step 4: Verify** — `npx tsc --noEmit`, lint. Browser: Relationships fields and counter; at 1280px all counts visible, at 390px only the active tab's count; on a new service, enter an existing Service Code and Save: the error-summary link still jumps to `service-code`.
- [ ] **Step 5: Commit** — `feat(services): direct relationship fields and tab-count polish`.

---

### Task 13: Whole-editor QA

**Files:** none modified unless a defect is found (fix it in the owning task's file and commit separately).

- [ ] **Step 1: Build** — `npm run build` (vite build + `tsc --noEmit`) and `npm run lint`; both pass.
- [ ] **Step 2: Tests** — `npx vitest run` passes.
- [ ] **Step 3: Walkthrough** as an admin at 1280px and 390px, light and dark, on (a) a standalone service, (b) a service in a display group opened as a variant (`variantOnly`: Timing & Routing and Application Form tabs hidden, notice shown), (c) a new service (`/admin/services/new`): every tab renders, no horizontal page scroll, focus rings visible, Save & Publish works for each (create and edit), the leave-guard dialog appears with unsaved changes, error-summary links land on the right field in every tab.
- [ ] **Step 4: WebKit pass** — repeat 1280px and 390px in WebKit (the owner uses Safari; a prior `h-full`-in-grid bug only reproduced there) focusing on the sheets, the fee table and the requirements table wrapper.
- [ ] **Step 5: Report** anything not verified (for example if WebKit could not be launched) to the owner instead of claiming it done.
