# Request message thread (Email Inquiry) — design

Status: draft for review · Date: 2026-10-13 · Path: architectural

## 1. Goal

"Email Assisted-Online Inquiry/Verification for Birth, Death and Marriage
Certificates" (`EMAIL_INQUIRY`, charter item 16) is a question-and-answer
service: the applicant asks CCRO to verify a record, CCRO answers within 2 hours,
no fee. By email, follow-ups just work. On CiviCheck today they do not:

- Staff can mark a request `incomplete` with a reason, and the applicant can
  re-upload files.
- The applicant has **no way to type a message** back. If staff ask "which Maria
  Santos, born when?", the only thing the applicant can do is upload a file.
- After the reply, an applicant who does not understand it has nowhere to ask.

This adds a **per-request message thread** between the applicant and the CCRO
staff handling it. It is asynchronous, like email replies attached to the
request. It is not live chat.

Success looks like: an applicant opens their `EMAIL_INQUIRY` request, sees the
staff reply, writes a follow-up, and staff of the owning department are notified
in-system; staff reply and the applicant gets an in-system notification and an
email; nobody outside the request's applicant and owning department can read it.

## 2. Scope

In scope

- A `request_messages` table, immutable, written only by a server function.
- A per-service switch, `services_registry.allows_messages`, off by default and
  on for `EMAIL_INQUIRY` only.
- A "Messages" card on the applicant request page and the staff request page,
  shown only when the service allows messages, refreshed through the existing
  realtime hook.
- One new applicant notification type (`message`) and one new staff notification
  type (`new_message`), both in-system, plus an email to the applicant.

Out of scope

- Live chat: typing indicators, presence, read receipts, delivery status.
- Attachments in messages. Files keep using the existing re-upload flow.
- Editing or deleting a message, and any moderation UI.
- Replying **by email** (inbound email parsing). The email only says "you have a
  new message"; the reply is written in CiviCheck.
- SMS, AI-drafted replies, translation.
- Turning the thread on for services other than `EMAIL_INQUIRY`. The switch
  exists so that is a one-row change later, not new code.
- Walk-in encoding of emailed inquiries. See §8.

`CLAUDE.md` does not list messaging in §5 (core features) or §6 (out of scope).
The thread stays inside §5.6 ("in-system + email only"). It is new scope that
the project owner chose, and §5 should be updated once it ships.

## 3. Verified facts this design relies on

Checked against the live CiviCheck project (read-only queries) and the repo on
2026-10-13.

- `requests.request_type` is an FK to `services_registry(service_code)`; the
  owning department is `services_registry.department_id`. `EMAIL_INQUIRY` is in
  department `archives`, fee `0.00`, `processing_time` "2 hours".
- Request visibility is already enforced by RLS: applicants see own requests
  (`applicant_id = auth.uid()`); `staff` / `supervisor` see requests whose
  service belongs to their department; `admin` and `cashier` see all. Cashier has
  no request detail page.
- Applicant `notifications` has a CHECK constraint
  `notifications_type_check` limited to `status_change`,
  `pre_validation_complete`, `document_rejected`. `staff_notifications` has
  `staff_notifications_type_check` with six types. Adding a type needs both the
  constraint and the `NotificationType` union in
  `src/features/notifications/notifications.queries.ts` changed.
- Staff notifications are written by `security definer` fan-out triggers wrapped
  in exception handlers, so a failed notification never rolls back the event
  that caused it. A caller with no end-user identity (service role) is trusted by
  `notification_actor_is`.
- Request writes are server-only (`fix/server-only-request-creation`, the
  dropped applicant INSERT policy). Server functions use `createServerFn` with
  `requireActiveSession(<permission>)`; staff-side department scoping is
  re-checked in the function (see `advanceRequestStatusFn`).
- Status changes already carry free-text `remarks`, included in the applicant's
  status-change email and the history timeline. That covers a one-way staff
  reply but gives the applicant no way to answer.
- `useRealtimeRefresh({ tables })` re-runs route loaders on `postgres_changes`.
  The table must be in the `supabase_realtime` publication and the viewer's RLS
  must allow SELECT.
- There are no automated tests in the repo (no `*.test.*` files, no test script).

## 4. Design

### 4.1 Data

```sql
create table public.request_messages (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests(id) on delete cascade,
  sender_id   uuid references public.profiles(id) on delete set null,
  sender_role text not null check (sender_role in ('applicant', 'staff')),
  body        text not null
              check (char_length(btrim(body)) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index request_messages_request_idx
  on public.request_messages (request_id, created_at);

alter table public.services_registry
  add column allows_messages boolean not null default false;
update public.services_registry set allows_messages = true
  where service_code = 'EMAIL_INQUIRY';
```

- `sender_role` is `'staff'` for staff, supervisor and admin senders; the exact
  role stays on `profiles`.
- No `updated_at`, no edit, no delete: the thread is a faithful record.
- `on delete cascade` matches how attachments behave when a request is removed.
- Add the table to the `supabase_realtime` publication.

### 4.2 Access

- RLS enabled. `revoke all` from `anon` and `authenticated`; grant `select` to
  `authenticated`; `all` to `service_role`. **No insert, update or delete grant
  for clients.**
- SELECT policy: the parent request is visible to the caller (the subquery runs
  under the caller's RLS on `requests`) **and** the caller is the request's
  applicant or has role `staff`, `supervisor` or `admin`. Cashier is excluded:
  it has no request page and no need for the content.

### 4.3 Writing a message

A `postRequestMessageFn` server function:

1. `requireActiveSession`. An applicant sends as `applicant`; a personnel session
   needs `requests:process` and is scoped to its department exactly as
   `advanceRequestStatusFn` does (admin unscoped).
2. Loads the request with `services_registry(allows_messages, department_id)`.
   Rejects when `allows_messages` is false, when the applicant does not own the
   request, or when the staff member's department does not match.
3. Trims the body, enforces 1 to 1000 characters.
4. Flood limit: rejects when the same sender already wrote 10 messages on this
   request in the last hour (constant in code, easy to change).
5. Inserts with the service role and returns the row.
6. For a staff message, builds and dispatches the applicant notification (§4.4).

The thread is **always open**: any request status, including `released` and
`rejected`. The reply typically arrives at the last step, and the applicant must
still be able to say they do not understand it.

### 4.4 Notifications

- **Staff writes → applicant.** A new builder, `buildNewMessageEmail`, in
  `notifications.server.ts`, dispatched through the existing
  `dispatchApplicantNotification`. Type `message`. Subject
  `Request <tracking>: new message from CCRO`. Body: "CCRO sent you a message
  about request <tracking>." + action `open "My Requests" to read and reply.`
  **The message text is not included**: replies cannot be sent by email, so the
  applicant has to sign in anyway, and this keeps personal details out of inboxes.
- **Applicant writes → staff.** An `AFTER INSERT` trigger on `request_messages`
  where `sender_role = 'applicant'`, using the existing fan-out helper and
  exception guard. Type `new_message`. The audience is chosen by the trigger's
  call to `notify_internal_recipients`, exactly like `new_request`: roles
  `staff` and `supervisor`, department-scoped, so active staff of the owning
  department are notified and admin is not. (`notification-audience.ts` only
  decides which *feed* a role reads; it is not touched.) The helper skips the
  acting user and does not collapse repeats for this type; the flood limit in
  §4.3 bounds it.
- Both type constraints, the `NotificationType` union, and the notification
  page's `TYPE_STYLE` map (typed `Record<NotificationType, …>`) are extended.

### 4.5 Screens

- A `RequestMessagesCard` in `src/features/requests/components/`, used by
  `MyRequestDetailPage` and `RequestDetailPage` when the loader reports
  `allowsMessages`.
- Oldest first; each message shows who (Applicant, or the staff member's name and
  "CCRO") and time; a textarea with a live character counter; Send.
- Plain text only (React escapes it; `whitespace-pre-wrap` keeps line breaks).
- Empty state: "Have a question about this request? Send a message to CCRO."
- A one-line hint: "Don't send passwords or payment details here."
- No promised response time; the card does not repeat the processing time.
- `useRealtimeRefresh({ tables: ["request_messages"] })` on both pages.
- The detail loaders gain `allowsMessages` and `messages`.

### 4.6 Admin switch

An `allows_messages` toggle next to `asks_purpose` in `CaseQuestionsSection`,
carried through the service configuration payload. This touches
`save_service_configuration`, which is **an unapplied local migration**
(`20261013120000_add_save_service_configuration.sql`). See §7.

## 5. Sequencing

Two pieces, in this order. Each gets its own plan.

1. **Email Inquiry service content** (bounded, already designed in chat): the
   case questions (record, date/place, registry number, what to verify, "are you
   the person named on the record?"), Authorization Letter required only when the
   answer is no, `where_to_secure` from the charter, purpose removed, and the
   applicant "ready for release" copy changed for this service so it no longer
   says "claim your document at the CCRO".
2. **The thread** in this document.

## 6. Verification

The repo has no automated tests, so verification is explicit and manual, and the
plan must say so rather than imply otherwise:

- SQL checks under `set local role authenticated` with crafted JWT claims:
  applicant A cannot read applicant B's thread; staff of another department
  cannot read it; cashier cannot read it; a direct client INSERT, UPDATE and
  DELETE are all denied; an empty and a 1001-character body violate the CHECK.
- Server function: rejected when `allows_messages` is false, when the applicant
  does not own the request, when the staff department differs, and past the flood
  limit.
- Manual, two sessions (applicant and staff): send, receive, realtime refresh,
  notification and email, and the thread stays open after `released`.
- `tsc --noEmit` clean.

## 7. Risks and dependencies

- **Unapplied migration.** `save_service_configuration` is not on the remote
  project. If it is applied first, the toggle extends it. If not, ship the column
  and the `EMAIL_INQUIRY` value by migration and add the admin toggle after.
  Either way the thread itself does not wait on it.
- **Staff workload.** The thread invites questions. It is limited to one service
  and a flood limit; the card makes no response-time promise.
- **Personal data in free text.** Messages can contain civil-registry details.
  They are visible only to the applicant and the owning department, are not
  emailed, and are immutable. Retention is not addressed here; flag it if CCRO
  has a data-privacy policy that needs one.
- **No moderation.** Staff cannot delete a message. An admin would need database
  access to remove one.
- **Notification fan-out coupling.** The new staff type needs the audience rule
  and the constraint change together, or the trigger's exception guard will
  swallow a constraint violation and staff will silently get no notification.
  The plan must test that path.

## 8. Correction to earlier discussion: walk-in encoding

During brainstorming it was suggested that staff could encode an inquiry that
arrived by email "the same way they encode walk-ins". That is **not relied on**
here. The 2026-10-10 staff-notifications spec records that the client decided to
remove walk-in intake (a separate task, still in the code today). So:

- Applicants who email CCRO directly are outside CiviCheck. Staff reply by email
  as they do now, or ask the person to use the form.
- Nothing in this design requires walk-in encoding, and it adds no dependency on
  it existing or not.

## 9. Open questions

None blocking. Settled during planning: the staff notification audience is
`staff` + `supervisor`, department-scoped (§4.4). The admin toggle (§4.6) is
**deferred out of the first plan**, per the §7 fallback: the column and the
`EMAIL_INQUIRY` value ship by migration, and the toggle follows once
`save_service_configuration` is applied. Until then the switch is changed by
SQL.
