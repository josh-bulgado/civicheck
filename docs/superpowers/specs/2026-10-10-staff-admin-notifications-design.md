# Staff & admin in-system notifications — design

Status: draft for review · Date: 2026-10-10 · Path: architectural

## 1. Goal

The applicant portal has an in-system notification feed with an unread badge.
CCRO staff, supervisors, cashiers and admins have none, so they only learn that a
request needs them by opening the queue. This adds a feed for those roles, and
**only notifies a role about events that role actually has to act on**.

Success looks like: a staff member sees "new request" and "document resubmitted"
for their own department; the cashier sees every request awaiting payment
verification; the admin sees what is ready to hand over; nobody sees anything
they can't act on, and nobody sees another department's requests.

## 2. Scope

In scope

- A `staff_notifications` table, filled by database triggers.
- Role-aware reads/writes on the existing `/notifications` route, sidebar item
  and unread badge for `staff`, `supervisor`, `cashier`, `admin`.
- A companion change so **fee-free requests are confirmed by the cashier**
  (checkbox, no OR number), which is what makes the cashier notification
  actionable for them (§6).

Out of scope

- Email to staff or admin (in-system only; `CLAUDE.md` §5.6 allows this).
- Any notification for `system_admin` (security and audit events already live in
  the Security and Audit Centers).
- Changes to the applicant `notifications` table, its email outbox, or its
  triggers/dispatch code.
- **Removing walk-in intake.** The client has decided to remove it; that is a
  separate task with its own spec (see §10). Nothing here depends on walk-ins
  existing or not.
- Backfilling notifications for requests already in flight.

## 3. Verified facts this design relies on

Checked against the live CiviCheck project (read-only queries) and the repo on
2026-10-10.

- `notifications.recipient_email` is `NOT NULL` and the table doubles as the email
  outbox (`status`, `sent_at`). Its policies hang off request ownership
  (`requests.applicant_id`). Extending it for internal recipients would mean
  reworking every applicant policy and query, so this design leaves it alone.
- `requests.request_type` is an FK to `services_registry(service_code)`; the
  owning department is `services_registry.department_id`. All 25 services have a
  department today. `profiles.department_id` is the staff side of the same join,
  and is what the request-queue RLS already uses.
- `profiles.access_status` ∈ active / suspended / deactivated. There are 11
  non-applicant profiles; only active ones should be notified.
- `requests.or_number` is nullable with only a unique index (`uq_requests_or_number`);
  there is no check tying `payment_status = 'verified'` to a value. Multiple NULLs
  are allowed, so a fee-free confirmation needs no schema change.
- `requests.payment_status` is `'unpaid' | 'verified'`; `status` has the seven
  codes in `CLAUDE.md` §4.
- The only existing triggers on `requests`, `requirements_attachments` and
  `profiles` are `BEFORE UPDATE … handle_updated_at`. The new triggers are
  `AFTER` and add no ordering conflict.
- Attachments are inserted **after** the request, in a separate statement
  (`services.mutations.ts`), and the request is deleted if that insert fails.
  Hence `on delete cascade` on `request_id` below.
- Cashier has `requests:collect_payment` / `requests:view_payments` but **not**
  `requests:view_all`, so it cannot open `/requests/$requestId`. Its notifications
  link to the cashier counter instead.
- `ROLE_GROUP_LAYOUTS` in `app-sidebar.tsx` lists items by id for `admin` and
  `system_admin` only; an item not named there is silently dropped for admin.
  `staff`, `supervisor` and `cashier` fall back to one flat group.

## 4. Data model

```sql
create table public.staff_notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  request_id   uuid not null references public.requests(id) on delete cascade,
  tracking_number text not null,
  type         text not null check (type in (
                 'new_request',
                 'document_resubmitted',
                 'awaiting_cashier',
                 'ready_to_release',
                 'request_incomplete',
                 'request_rejected')),
  title        text not null,
  body         text not null,
  is_read      boolean not null default false,
  read_at      timestamptz,
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index staff_notifications_recipient_idx
  on public.staff_notifications (recipient_id, created_at desc);
create index staff_notifications_unread_idx
  on public.staff_notifications (recipient_id) where not is_read;
create index staff_notifications_request_idx
  on public.staff_notifications (request_id);
```

One row per recipient (fan-out on write). The office is small, so per-user read
and archive state is simpler than per-role rows with a side table.

`tracking_number` is denormalized on purpose: the feed label and the cashier
deep link must not depend on the reader still having RLS access to the
`requests` row (for example after a staff member changes department).

### Security

- RLS enabled. `select` and `update` policies: `recipient_id = (select auth.uid())`.
- `revoke insert, delete, truncate` from `authenticated` and `anon`; `grant update
  (is_read, read_at, archived_at)` only. Nothing but the trigger function writes
  rows.
- Added to the `supabase_realtime` publication; Realtime evaluates each event
  against the subscriber's own RLS, so a user only receives their own rows.
- Titles and bodies are plain text rendered as text (no HTML), same rule as the
  applicant feed.

## 5. Triggers and recipient rules

One `security definer` function, `search_path = public`, execute revoked from
`public`, `anon` and `authenticated` (only triggers invoke it):

```
notify_internal_recipients(
  p_request_id uuid, p_type text, p_title text, p_body text,
  p_roles text[], p_department_scoped boolean)
```

It inserts one row per profile where `role = any(p_roles)` and
`access_status = 'active'` and `id is distinct from auth.uid()`. When
`p_department_scoped`, it additionally requires `profiles.department_id` to equal
the department of the request's service. A missing department therefore matches
nobody, never everybody (consistent with `docs/RBAC.md`).

| Event | Trigger | Recipients | Type |
|---|---|---|---|
| Online request submitted | `AFTER INSERT` on `requests` when `status = 'submitted'` | active `staff`, `supervisor` in the service's department | `new_request` |
| Rejected document resubmitted | `AFTER UPDATE OF verification_status` on `requirements_attachments` when `old = 'rejected'` and `new = 'pending'` | same department staff and supervisors | `document_resubmitted` |
| Request reaches `ready_for_release` (fee or no fee) | `AFTER UPDATE OF status` on `requests` when it changed to `ready_for_release` | all active `cashier` | `awaiting_cashier` |
| Payment verified, or fee-free confirmed | `AFTER UPDATE OF payment_status` on `requests` when it changed to `verified` | all active `admin` | `ready_to_release` |
| Request marked `incomplete` | `AFTER UPDATE OF status` when it changed to `incomplete` | all active `admin` | `request_incomplete` |
| Request marked `rejected` | `AFTER UPDATE OF status` when it changed to `rejected` | all active `admin` | `request_rejected` |

Rules that apply to all of them:

- **Transitions only.** Every update trigger has a `WHEN (old … is distinct from
  new …)` guard so the `handle_updated_at` touch and unrelated updates never
  fire a notification.
- **Actor excluded** via `auth.uid()`. Service-role writes have a null uid and
  exclude nobody, which is correct (no human actor).
- **Snapshot recipients.** Recipients are resolved at write time. Reassigning or
  deactivating someone later does not rewrite history.
- **Only the right actor can announce an event.** The role gates (only the
  cashier verifies payment, only process roles move a request on) live in the
  server functions, but the RLS UPDATE policies on `requests` and
  `requirements_attachments` let any department staff write those columns
  through the API. Each trigger therefore re-checks the actor: status changes
  need `staff`/`supervisor`/`admin`, `payment_status → verified` needs
  `cashier`, and a document "resubmission" must come from the request's own
  applicant. An actor with no end-user identity (service role, migrations, SQL
  editor) is trusted; an `anon` token, which also has no `sub`, is not.
- **Only legal transitions are announced.** The server function enforces
  `ALLOWED_TRANSITIONS`, but RLS lets staff write `status` directly, so
  `ready_for_release` is announced only out of `processing`, `incomplete` only
  out of `under_validation`, and `rejected` only out of an open stage
  (`submitted`, `under_validation`, `incomplete`, `processing`). This mirrors
  `request-workflow.ts` and must be kept in step with it.
- **A claim must be backed by its field.** "Payment verified" for a request
  with a fee is only announced when `or_number` is present; a fee-free
  confirmation (no OR by design) is announced without one.
- **Client-supplied text never reaches a feed unvalidated.** Applicants can
  insert and edit their own rows through the API, so the tracking number must
  match `CCRO-YYYY-NNNNNN` or nothing is fanned out, and a requirement name is
  shown only if it exists in the service's requirement catalog (otherwise the
  alert is generic).
- **Applicant-triggered alerts collapse while unread, by refreshing.** A
  `new_request` or `document_resubmitted` row is not repeated for the same
  recipient and request while an unread, unarchived one exists. The existing row
  is refreshed in place (new `created_at`, latest title and body), which emits a
  Realtime UPDATE, so toggling a document cannot multiply rows yet a staff
  member who works from the queue and never opens the feed still sees each new
  event.
- **The fee decision uses the stored fee.** Fee-free vs. fee is read from
  `OLD.fees_due`, because the same UPDATE can rewrite `fees_due`.
- **Fan-out never blocks the originating write.** Each trigger function wraps its
  call in an exception handler that logs a warning and returns. A failed
  notification must never roll back an applicant's submission or a cashier's
  confirmation (the same guarantee `dispatchApplicantNotification` gives).
- **A department with no active staff notifies nobody.** Today `death` (2
  services) and `archives` (5 services) have no staff assigned at all, so
  requests for those services create no `new_request` rows. This is a staffing
  fact, not a bug, but it is called out in §10.
- **No document-count in "new request".** Documents are attached by a second
  statement, so the insert trigger cannot know the count. The new-request
  notification stands in for the initial pre-validation upload; only
  resubmissions get their own notification.
- **Re-entering a state notifies again.** `ready_for_release → processing →
  ready_for_release` is a genuinely new event.
- **Copy.** `awaiting_cashier` reads "Ready for payment verification" when
  `fees_due > 0` and "Ready for fee-free confirmation" when not. `ready_to_release`
  reads "Payment verified" or "Fee-free request confirmed" accordingly. Every
  title carries the tracking number; bodies name the service, plus the
  requirement name for `document_resubmitted`.

## 6. Companion change: cashier confirms fee-free requests

Today the code deliberately routes free requests around the cashier. The client
wants the cashier involved, with a checkbox and no OR number. Changes:

| Where | Change |
|---|---|
| `request-workflow.ts` `isPaymentSettled` | Drop the `feesDue <= 0` shortcut. Settled means `payment_status === 'verified'` for every request. Consumers: `requests.mutations.ts` (release check) and `RequestDetailPage.tsx`. |
| `requests.mutations.ts` `verifyPaymentFn` | Remove the "No fee is due" rejection. When the **stored** `fees_due <= 0`: no OR required; the caller must send an explicit `confirmNoFee: true`; set `payment_status = 'verified'` and leave `or_number` null. The server decides fee-free from the stored fee, never from the client. The status guard (`ready_for_release`, re-asserted in the update) is unchanged. |
| `verifyPaymentFn` audit log | `action_status: 'payment_verified'`, remarks "Fee-free request confirmed by cashier — no payment due." (Reusing `payment_verified` keeps Payment History's daily count and listing working.) |
| `advanceRequestStatusFn` | Remove the branch that auto-sets `payment_status = 'verified'` on release; release is now unreachable without it. Update the comment above `paymentSettled`. |
| `PaymentVerificationPanel.tsx` | For `feesDue <= 0` and `ready_for_release` and `canCollect`: show a "Confirm no fee is due" checkbox and a Confirm button instead of the OR input. After verification show "Fee-free — confirmed by cashier". Replace the "nothing for the cashier to verify" copy; non-cashier roles see "The cashier confirms fee-free requests before release." |
| Payment History | Fee-free confirmations appear with a blank OR number. `PaymentHistoryColumn` and the CSV export already null-guard `orNumber`. |

Decision recorded: admin is **hard-blocked** from releasing a fee-free request
until the cashier confirms it, matching the paid flow.

Existing data: fee-free requests currently at `ready_for_release` become gated
until confirmed. They get no retroactive notification; the cashier finds them via
the counter lookup. Already-`released` requests are unaffected.

## 7. App wiring

**Permission.** Add `notifications:view_staff` to `staff`, `supervisor`,
`cashier`, `admin` in `src/lib/permissions.ts`. Not granted to `applicant` or
`system_admin`. Document it in `docs/RBAC.md`.

**Server functions** (`src/features/notifications/`). The four existing functions
keep their names and the page keeps calling them; each resolves the session
without a hard-coded permission, then branches on role:

| Function | Applicant (`requests:view_own`) | Staff roles (`notifications:view_staff`) |
|---|---|---|
| `getMyNotificationsFn` | unchanged | reads `staff_notifications` where `recipient_id = user.id`, newest first, same `limit + 1` paging (uses the denormalized `tracking_number`) |
| `getUnreadNotificationCountFn` | unchanged | counts unread, not archived, for `recipient_id = user.id` |
| `updateNotificationFn` | unchanged | verifies the row's `recipient_id = user.id`, applies the same `patchFor` actions |
| `markAllNotificationsReadFn` | unchanged | updates the caller's unread rows |

Any other role gets the existing access-denied behaviour. The applicant code
path is not modified beyond the role dispatch.

**View model.** `NotificationRow` stays the page's single row shape. Staff rows
map `title → subject`, set `status` to `"sent"`, and carry an `href`
(`/requests/$requestId` for staff, supervisor, admin; `/cashier?tracking=<n>` for
cashier). `NotificationType` is widened with the six new values.

**Route** `/_authed/_dashboard/notifications`: `beforeLoad` accepts
`requests:view_own` **or** `notifications:view_staff`. Still one route file; the
loader already calls role-dispatching functions (`CLAUDE.md` §8).

**Dashboard shell** (`_dashboard/route.tsx`): the unread count is loaded for any
role holding either permission, and `useRealtimeRefresh({ tables:
["notifications", "staff_notifications"] })` is enabled for those roles
(`enabled` currently keys off `role === "applicant"`).

**Sidebar** (`app-sidebar.tsx`): show the Notifications item when
`requests:view_own` **or** `notifications:view_staff`. Add `"notifications"` to
the admin `Operations` group in `ROLE_GROUP_LAYOUTS`, otherwise it is dropped for
admin. Staff, supervisor and cashier use the flat fallback and need nothing.

**Cashier deep link.** `CashierCounter` reads an optional `tracking` search param
on `/cashier` and runs the existing lookup on mount, so a notification lands on
the right request.

## 8. UI

`NotificationsPage` is reused unchanged in structure (day grouping, All /
Unread / Archived tabs, read/unread/archive actions, load more). Additions:
icons for the six new types, and link target from `href` rather than the
applicant-only "My Requests" route. Copy that is applicant-specific
("Open "My Requests"…") is not used for staff types.

## 9. Testing

- **SQL, against a Supabase branch**, per trigger: correct recipient set; inactive
  and suspended excluded; actor excluded; staff in another department excluded;
  user with null department gets nothing; update-without-transition fires
  nothing; `ready_for_release` re-entry fires again; deleting a request
  cascades its notifications.
- **RLS:** user A cannot select or update user B's rows; `authenticated` cannot
  insert or delete; update is limited to the three state columns.
- **Fee-free flow:** `verifyPaymentFn` rejects fee-free without `confirmNoFee`,
  accepts with it and leaves `or_number` null, still requires an OR for a fee;
  admin release is blocked before confirmation and allowed after.
- **App:** the repo has no unit-test harness (no test runner in `package.json`,
  no `*.test.*` files), and this work does not add one. Verification is the SQL
  and RLS checks above plus a Playwright pass per role covering badge, feed, deep
  link and realtime arrival, and `tsc` for the widened types.

## 10. Rollout and follow-ups

- The migration is written as a file and applied to a **Supabase branch** first;
  it is not applied straight to the production project without approval.
- **Walk-in removal** is a separate brainstorm → spec → plan. It touches roughly
  72 references across about 20 files, the `requests:encode_walkin` permission,
  `encodeWalkInFn`, the intake dialog and queue UI, the service report, and
  `CLAUDE.md` §2, §5.2 and §9 (landing copy: "Online or Walk-In", "or at the CCRO
  window"). Until it lands, a walk-in encode will notify the department's other
  staff with `new_request` (the encoder is excluded as actor). Minor, and it
  disappears with that task.
- **Unstaffed departments.** `death` and `archives` have no staff, so their
  new requests notify nobody. Whether admins should be the fallback recipient is
  an open decision for the project owner; this spec does not add one.
- `CLAUDE.md` needs no change for this work; §5.6 already limits notifications
  to in-system and email.

## 11. Decisions log

| Question | Decision |
|---|---|
| Extend `notifications` or add a table | New `staff_notifications`; applicant outbox untouched |
| Fan-out location | Postgres triggers (applicant-initiated events run under the applicant's session; the existing dispatcher cannot write for them) |
| Who is notified per event | §5 table, confirmed by the project owner |
| Fee-free requests | Cashier confirms with a checkbox, no OR; admin hard-blocked until then |
| Walk-in handling | No walk-in rules here; removal is its own task |
| Admin alerts on `incomplete` / `rejected` | Included |
| System admin | No notifications |
