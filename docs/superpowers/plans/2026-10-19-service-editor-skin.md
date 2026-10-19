# Service Editor Skin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the finished Edit Service screen the look of the approved prototype (`docs/superpowers/specs/assets/2026-10-19-service-editor-prototype.html`) without changing any other screen.

**Architecture:** Additive only. New variants on the shared `ui/` primitives that nothing else uses, an `.service-editor` scope class in `app.css` (same pattern as `.citizen-portal` and `.apply-wizard`), and the editor opting in. Shared defaults stay as they are.

**Tech Stack:** React, TanStack Start, Tailwind v4, shadcn/ui on Base UI, class-variance-authority.

**Spec:** `docs/superpowers/specs/2026-10-19-service-editor-redesign-design.md`. This plan supersedes its "keep inputs at current height" line for the editor only. Font stays Helvetica Neue until the owner decides on Geist.

## Global Constraints

- No existing variant, size or default changes; every addition is opt-in.
- Existing tokens only (`--radius-*`, `--shadow-portal-*`, `primary`, `card`, `muted`); no new colors.
- The app has no global dark theme (only a scoped `.dark` rule on the system-health page), so there is no dark mode to verify.
- Dialogs, sheets, menus and selects portal outside the editor wrapper; re-apply the editor scope where they need the editor's tokens.
- `FormTemplateBuilder` is shared with the shared-blocks editor; restyle it through props or the scope class, never its defaults.
- Commit only the files each task names. `src/components/ui/attachment.tsx` and `sites/` are unrelated untracked files.
- Verification: `npx tsc --noEmit`, `npx eslint <paths>`, `npx vitest run`, then browser checks at 1280px and 390px and WebKit where possible.

## Review Focus

- An unrelated screen (staff dashboard, a data table, a dialog) looks identical after each task.
- Select, sheet and dialog content opened from the editor matches the editor, not the default look.
- The fee table stays compact; `touch` heights are not applied inside it.
- Safari: segmented tab track scrolls horizontally on a narrow bar without a visible scrollbar.

---

### Task 1: Additive variants (done)

**Files:** `src/components/ui/button.tsx`, `input.tsx`, `select.tsx`, `card.tsx`, `tabs.tsx`

**Interfaces — Produces:**
- `Button`: `variant="raised"` (gradient primary), `size="touch"` (h-11, rounded-xl).
- `Input`: `fieldSize?: "default" | "touch"`.
- `SelectTrigger`: `size` also accepts `"touch"`.
- `Card`: `variant="soft"` (rounded-3xl, `shadow-portal-panel`).
- `TabsList`: `variant="segmented"` (rounded track; active tab is a raised card-colored tile).

- [x] Add the variants; `tsc` and `eslint` clean; built CSS contains each new class.
- [x] Commit `feat(ui): additive touch, raised, soft and segmented variants`.

### Task 2: Editor scope (no new class needed yet)

The editor already carries `data-service-editor` (set in `ServiceFormPage` and `ServiceGroupApplicationPage`, styled in `app.css`). Use that hook instead of adding `.service-editor`; add scoped tokens (for example the portal's `--muted-foreground`) only when a tinted row needs them.

- [x] Decision recorded; nothing to commit.

### Task 3: Shell

**Files:** Modify `src/features/admin/services/components/ServiceFormPage.tsx`

- [x] Wrapper already has `data-service-editor`.
- [x] Header: round back button, title, status chip; Cancel `size="touch"`, Save & Publish `variant="raised" size="touch"`.
- [x] Tab bar: `TabsList variant="segmented"`; counts visible only on the active tab. Keep tab ids, hash handling and `variantOnly` as they are.
- [ ] Verify in the browser (needs an admin session): error-summary anchors still resolve, leave-guard dialog appears, tab bar scrolls on a 390px screen.
- [x] Commit `feat(services): editor shell skin`. The header, action bar and tab bar are shared with the shared-application editor (`ServiceGroupApplicationPage`), so it changes too.

### Task 4: Registry & Fees and the other tabs

**Files:** the `service-form-sections/*` components

- [x] (done for the shared section card and Registry & Fees; verified at 1440px and 390px) `Card variant="soft"` for each tab card; group-header bands; `fieldSize="touch"` / `size="touch"` on inputs and selects; lock-prefix input for the read-only Service Code; help text under the control where it reads better.
- [ ] Leave the fee table, requirements table and field table on their compact controls.
- [ ] Commit per tab.

### Task 5: Overlays

- [ ] Re-apply the editor scope on the requirement sheet, field inspector and any dialog opened from the editor; check select popups.

### Task 6: QA

- [ ] Walk every tab for a standalone service, a variant (`variantOnly`) and a new service, at 1280px and 390px, light and dark, plus WebKit.
- [ ] Open the staff dashboard, a data table and the shared-blocks editor; confirm they look unchanged.
- [ ] Report anything not verified instead of claiming it done.
