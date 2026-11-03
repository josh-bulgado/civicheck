# Request Message Thread Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an applicant and the CCRO staff handling their request exchange short asynchronous messages inside the request, switched on per service (only `EMAIL_INQUIRY` for now).

**Architecture:** One immutable `request_messages` table readable under RLS by the applicant and the owning department's staff, written only through a server function that checks ownership, the per-service switch, length and a flood limit. A staff message creates an applicant notification (in-system + email, no message text); an applicant message creates a staff notification through a database trigger that reuses the existing `notify_internal_recipients` fan-out. A Messages card on both request pages, refreshed by the existing realtime hook.

**Tech Stack:** Supabase Postgres + RLS + Realtime, TanStack Start server functions (`createServerFn`), React 18, shadcn/ui, Resend (existing).

**Spec:** `docs/superpowers/specs/2026-10-13-request-message-thread-design.md`

## Global Constraints

- Notifications are **in-system + email only** (`CLAUDE.md` §5.6). No SMS, no live chat, no inbound email parsing.
- A message body is **1 to 1000 characters** after trimming; the database CHECK is `char_length(btrim(body)) between 1 and 1000`.
- Messages are **immutable**: no UPDATE or DELETE grant to any client role; no edit or delete UI.
- Clients get **SELECT only**. Every write goes through `postRequestMessageFn`; no client INSERT grant.
- The applicant email says "new message" and **never contains the message text**.
- The thread is **always open**: any request status, including `released` and `rejected`.
- **No attachments** in messages.
- **Cashier cannot read** the thread; `staff`, `supervisor`, `admin` and the owning applicant can.
- The switch is `services_registry.allows_messages`, **default false, true for `EMAIL_INQUIRY` only**.
- Flood limit: **10 messages per sender per request per 60 minutes**.
- Message text is rendered as **plain text** only (React escaping; `whitespace-pre-wrap`); never `dangerouslySetInnerHTML`.
- The admin on/off toggle is **out of this plan** (spec §9). The switch is changed by SQL until `save_service_configuration` is applied.
- Only `git add` the files each task names. The working tree already holds unrelated uncommitted work.

## Review Focus

1. **Cross-applicant access.** Applicant B reads or posts on applicant A's request → must see nothing and be rejected. (Task 1 SQL check; Task 3 server function; Task 6 manual.)
2. **Walk-in request** (`applicant_id` is null) on a service with the switch on → staff would be writing to nobody. Server function rejects; card hidden. (Task 3, Task 5, Task 6.)
3. **Switch off.** A service with `allows_messages = false` → no card, and a direct call to `postRequestMessageFn` is rejected. (Task 3, Task 6.)
4. **Bad bodies.** Blank, whitespace-only, 1001 characters, CRLF line breaks, emoji → rejected or normalized, never stored raw. (Task 1 SQL check; Task 3 Node check.)
5. **Silent notification failure.** The fan-out trigger swallows errors by design, so a missing `new_message` in `staff_notifications_type_check` would silently notify no one. (Task 2 asserts a row is actually created.)

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20261013190000_request_messages.sql` (create) | Table, index, RLS, grants, realtime publication, `allows_messages` column and its `EMAIL_INQUIRY` value |
| `supabase/migrations/20261013191000_request_message_notifications.sql` (create) | Notification type constraints and the applicant-message fan-out trigger |
| `src/features/requests/request-messages.ts` (create) | Pure constants, types, `normalizeMessageBody`, `isFlooded`. No imports. |
| `src/features/requests/request-messages.server.ts` (create) | `readRequestMessages(supabase, requestId)` shared by both detail loaders |
| `src/features/requests/request-messages.mutations.ts` (create) | `postRequestMessageFn` |
| `src/features/requests/components/RequestMessagesCard.tsx` (create) | The Messages card used on both pages |
| `src/features/notifications/notifications.queries.ts` (modify) | Add `message` and `new_message` to `NotificationType` |
| `src/features/notifications/notifications.server.ts` (modify) | Add `buildNewMessageEmail` |
| `src/features/notifications/pages/NotificationsPage.tsx` (modify) | `TYPE_STYLE` entries and icon import |
| `src/features/requests/applicant-requests.queries.ts` (modify) | Applicant detail loader returns `allowsMessages`, `messages` |
| `src/features/requests/requests.queries.ts` (modify) | Staff detail loader returns `allowsMessages`, `messages` |
| `src/features/requests/pages/MyRequestDetailPage.tsx` (modify) | Render the card |
| `src/features/requests/pages/RequestDetailPage.tsx` (modify) | Render the card |
| `src/routes/_authed/_dashboard/my-requests/$requestId.tsx` (modify) | Subscribe to `request_messages` |
| `src/routes/_authed/_dashboard/requests/$requestId.tsx` (modify) | Subscribe to `request_messages` |

There is no automated test runner in this repo. Verification is explicit: SQL checks run through the Supabase tool that roll themselves back, an inline Node check for the pure module, `tsc --noEmit`, and a manual two-session walkthrough. Do not add a test framework as part of this plan.

Migrations are applied to the CiviCheck project with the Supabase `apply_migration` tool (project `kfzpoemvrajrkqsufnmb`), the way every earlier case-question migration was. The tool stamps its own version, so the remote version number will differ from the file name.

---

### Task 1: Message table, access rules and the per-service switch

**Files:**
- Create: `supabase/migrations/20261013190000_request_messages.sql`

**Interfaces:**
- Produces: table `public.request_messages (id, request_id, sender_id, sender_role, body, created_at)`; column `public.services_registry.allows_messages boolean not null default false`. Later tasks read these exact names.

- [ ] **Step 1: Write the migration**

```sql
-- Per-request message thread, switched on per service.
--
-- "Email Assisted-Online Inquiry/Verification" is a question-and-answer service,
-- but the applicant had no way to type a reply: staff could mark a request
-- incomplete and the applicant could re-upload files, nothing more. This adds
-- an asynchronous thread between the applicant and the staff handling the
-- request. It is not live chat.
--
--   * Immutable: no UPDATE / DELETE grant, so the thread is a faithful record.
--   * Read-only for clients. Every write goes through postRequestMessageFn, the
--     same server-only pattern request creation uses.
--   * Cashier is excluded from reading: it has no request page and no need for
--     the content.
--   * services_registry.allows_messages is the switch. It is off by default and
--     on for EMAIL_INQUIRY only.
--
-- Spec: docs/superpowers/specs/2026-10-13-request-message-thread-design.md

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

alter table public.request_messages enable row level security;

revoke all on public.request_messages from anon, authenticated;
grant select on public.request_messages to authenticated;
grant all on public.request_messages to service_role;

-- The subquery on requests runs under the caller's RLS, so it inherits
-- "applicants see own requests" and "staff/supervisor see their department".
-- The role check then keeps the cashier (who can see request rows) out.
create policy "Thread participants can read request messages"
  on public.request_messages for select to authenticated
  using (
    (select public.is_active_user())
    and exists (
      select 1
      from public.requests r
      where r.id = request_messages.request_id
        and (
          r.applicant_id = (select auth.uid())
          or (select public.get_user_role()) in ('staff', 'supervisor', 'admin')
        )
    )
  );

-- Realtime evaluates the subscriber's own RLS, so the policy above also decides
-- who receives each event.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'request_messages'
  ) then
    alter publication supabase_realtime add table public.request_messages;
  end if;
end
$$;

alter table public.services_registry
  add column if not exists allows_messages boolean not null default false;

comment on column public.services_registry.allows_messages is
  'Whether applicants and staff can exchange messages on requests for this service.';

update public.services_registry
set allows_messages = true
where service_code = 'EMAIL_INQUIRY';
```

- [ ] **Step 2: Apply it**

Apply with the Supabase `apply_migration` tool: project `kfzpoemvrajrkqsufnmb`, name `request_messages`, `query` = the file's SQL.
Expected: `{"success":true}`.

- [ ] **Step 3: Run the access and constraint check**

Run this with the Supabase `execute_sql` tool. It builds its own fixtures from existing rows, checks each persona, and finishes by raising an exception, so **everything rolls back**; the report is in the error text.

```sql
do $$
declare
  v_request uuid;
  v_applicant uuid;
  v_dept text;
  v_other_applicant uuid;
  v_staff_same uuid;
  v_staff_other uuid;
  v_cashier uuid;
  v_admin uuid;
  v_msg uuid;
  v_seen integer;
  v_denied boolean;
  v_label text;
  v_uid uuid;
  v_want integer;
  v_report text := '';
begin
  select r.id, r.applicant_id, s.department_id
    into v_request, v_applicant, v_dept
  from public.requests r
  join public.services_registry s on s.service_code = r.request_type
  where r.applicant_id is not null and s.department_id is not null
  order by r.created_at
  limit 1;
  if v_request is null then
    raise exception 'RESULT: no fixture request found';
  end if;

  select id into v_other_applicant from public.profiles
   where role = 'applicant' and access_status = 'active' and id <> v_applicant limit 1;
  select id into v_staff_same from public.profiles
   where role in ('staff', 'supervisor') and access_status = 'active'
     and department_id = v_dept limit 1;
  select id into v_staff_other from public.profiles
   where role in ('staff', 'supervisor') and access_status = 'active'
     and department_id is distinct from v_dept limit 1;
  select id into v_cashier from public.profiles
   where role = 'cashier' and access_status = 'active' limit 1;
  select id into v_admin from public.profiles
   where role = 'admin' and access_status = 'active' limit 1;

  insert into public.request_messages (request_id, sender_id, sender_role, body)
  values (v_request, v_applicant, 'applicant', 'plan check')
  returning id into v_msg;

  for v_label, v_uid, v_want in
    select * from (values
      ('applicant_owner',  v_applicant,       1),
      ('other_applicant',  v_other_applicant, 0),
      ('staff_same_dept',  v_staff_same,      1),
      ('staff_other_dept', v_staff_other,     0),
      ('cashier',          v_cashier,         0),
      ('admin',            v_admin,           1)
    ) as t(label, uid, want)
  loop
    if v_uid is null then
      v_report := v_report || v_label || '=skipped; ';
      continue;
    end if;
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', v_uid, 'role', 'authenticated')::text,
      true
    );
    set local role authenticated;
    select count(*) into v_seen from public.request_messages where id = v_msg;
    reset role;
    v_report := v_report || format('%s=%s(want %s); ', v_label, v_seen, v_want);
  end loop;

  -- A client may not write at all.
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_applicant, 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;
  begin
    insert into public.request_messages (request_id, sender_id, sender_role, body)
    values (v_request, v_applicant, 'applicant', 'direct');
    v_denied := false;
  exception when insufficient_privilege then
    v_denied := true;
  end;
  reset role;
  v_report := v_report || format('direct_insert_denied=%s; ', v_denied);

  -- Body limits hold even for the service role.
  begin
    insert into public.request_messages (request_id, sender_id, sender_role, body)
    values (v_request, v_applicant, 'applicant', '   ');
    v_report := v_report || 'blank_body=ACCEPTED(BAD); ';
  exception when check_violation then
    v_report := v_report || 'blank_body=rejected; ';
  end;
  begin
    insert into public.request_messages (request_id, sender_id, sender_role, body)
    values (v_request, v_applicant, 'applicant', repeat('x', 1001));
    v_report := v_report || 'body_1001=ACCEPTED(BAD); ';
  exception when check_violation then
    v_report := v_report || 'body_1001=rejected; ';
  end;

  raise exception 'RESULT: %', v_report;
end
$$;
```

Expected (a persona with no matching profile reads `skipped` instead of a count):
`RESULT: applicant_owner=1(want 1); other_applicant=0(want 0); staff_same_dept=1(want 1); staff_other_dept=0(want 0); cashier=0(want 0); admin=1(want 1); direct_insert_denied=true; blank_body=rejected; body_1001=rejected;`

If any count differs from `want`, or a `(BAD)` appears, stop and fix the policy before continuing.

- [ ] **Step 4: Confirm the switch**

```sql
select service_code, allows_messages from public.services_registry
where allows_messages or service_code = 'OTHER_CERT' order by 1;
```
Expected: `EMAIL_INQUIRY | true` and `OTHER_CERT | false`, and no other row with `true`.

- [ ] **Step 5: Commit** (only when the user has asked for commits)

```bash
git add supabase/migrations/20261013190000_request_messages.sql
git commit -m "feat(db): add per-request message thread, switched on per service"
```

---

### Task 2: Notification types and the applicant-message trigger

**Files:**
- Create: `supabase/migrations/20261013191000_request_message_notifications.sql`

**Interfaces:**
- Consumes: `public.request_messages` and `public.notify_internal_recipients(p_request_id uuid, p_type text, p_title text, p_body text, p_roles text[], p_department_scoped boolean)` (already on the remote).
- Produces: applicant notification type `message`; staff notification type `new_message`; trigger `notify_request_message` on `request_messages`.

- [ ] **Step 1: Write the migration**

```sql
-- Notification plumbing for the request message thread.
--
--   * A staff message notifies the applicant: new type 'message' on
--     notifications (written by the server function through the existing
--     dispatch helper, which also sends the email).
--   * An applicant message notifies the owning department's staff and
--     supervisors: new type 'new_message' on staff_notifications, written by an
--     AFTER INSERT trigger through notify_internal_recipients, exactly like
--     'new_request'.
--
-- The trigger swallows its own errors by design (a failed notification must
-- never lose the message). That makes the CHECK constraint on
-- staff_notifications.type load-bearing: if 'new_message' were missing, the
-- insert would fail inside the guard and staff would silently get nothing. The
-- constraint change and the trigger therefore ship together.
--
-- The staff body is deliberately generic; the message text stays in
-- request_messages.

alter table public.notifications
  drop constraint notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'status_change',
    'pre_validation_complete',
    'document_rejected',
    'message'
  ));

alter table public.staff_notifications
  drop constraint staff_notifications_type_check;
alter table public.staff_notifications
  add constraint staff_notifications_type_check
  check (type in (
    'new_request',
    'document_resubmitted',
    'awaiting_cashier',
    'ready_to_release',
    'request_incomplete',
    'request_rejected',
    'new_message'
  ));

create or replace function public.trg_notify_request_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tracking text;
begin
  begin
    select r.tracking_number into v_tracking
    from public.requests r
    where r.id = new.request_id;

    perform public.notify_internal_recipients(
      new.request_id,
      'new_message',
      format('Request %s: new message', v_tracking),
      'The applicant sent a message about this request.',
      array['staff', 'supervisor'],
      true
    );
  exception when others then
    raise warning 'staff notification (new_message) failed for message %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function public.trg_notify_request_message() from public, anon, authenticated;

create trigger notify_request_message
  after insert on public.request_messages
  for each row
  when (new.sender_role = 'applicant')
  execute function public.trg_notify_request_message();
```

- [ ] **Step 2: Apply it**

Apply with `apply_migration`: name `request_message_notifications`, `query` = the file's SQL.
Expected: `{"success":true}`.

- [ ] **Step 3: Confirm both constraints name the new types**

```sql
select conname, pg_get_constraintdef(oid) like '%message%' as names_new_type
from pg_constraint
where conname in ('notifications_type_check', 'staff_notifications_type_check')
order by 1;
```
Expected: two rows, both `names_new_type = true`.

- [ ] **Step 4: Prove the trigger really creates a notification**

```sql
do $$
declare
  v_request uuid;
  v_applicant uuid;
  v_dept text;
  v_staff_same uuid;
  v_staff_other uuid;
  v_expected integer;
  v_same integer;
  v_other integer;
  v_after_applicant integer;
  v_after_staff integer;
begin
  select r.id, r.applicant_id, s.department_id
    into v_request, v_applicant, v_dept
  from public.requests r
  join public.services_registry s on s.service_code = r.request_type
  where r.applicant_id is not null and s.department_id is not null
    and r.tracking_number ~ '^CCRO-[0-9]{4}-[0-9]{6}$'
  order by r.created_at
  limit 1;
  if v_request is null then
    raise exception 'RESULT: no fixture request found';
  end if;

  select id into v_staff_same from public.profiles
   where role in ('staff', 'supervisor') and access_status = 'active'
     and department_id = v_dept limit 1;
  select id into v_staff_other from public.profiles
   where role in ('staff', 'supervisor') and access_status = 'active'
     and department_id is distinct from v_dept limit 1;
  select count(*) into v_expected from public.profiles
   where role in ('staff', 'supervisor') and access_status = 'active'
     and department_id = v_dept;

  insert into public.request_messages (request_id, sender_id, sender_role, body)
  values (v_request, v_applicant, 'applicant', 'plan check');

  select count(*) into v_after_applicant from public.staff_notifications
   where request_id = v_request and type = 'new_message';
  select count(*) into v_same from public.staff_notifications
   where request_id = v_request and type = 'new_message' and recipient_id = v_staff_same;
  select count(*) into v_other from public.staff_notifications
   where request_id = v_request and type = 'new_message' and recipient_id = v_staff_other;

  -- A staff reply must not notify staff.
  insert into public.request_messages (request_id, sender_id, sender_role, body)
  values (v_request, v_staff_same, 'staff', 'reply');
  select count(*) into v_after_staff from public.staff_notifications
   where request_id = v_request and type = 'new_message';

  raise exception 'RESULT: total=%(want %); same_dept_staff=%(want 1); other_dept_staff=%(want 0); after_staff_reply=%(want %)',
    v_after_applicant, v_expected, v_same, v_other, v_after_staff, v_after_applicant;
end
$$;
```

Expected: `RESULT: total=N(want N); same_dept_staff=1(want 1); other_dept_staff=0(want 0); after_staff_reply=N(want N)` where `N` is the number of active staff and supervisors in that department and is at least 1.

If `total=0`, the trigger's error guard swallowed a failure: read the Postgres warnings with `get_advisors`/logs and fix the constraint or trigger before continuing.

- [ ] **Step 5: Commit** (only when the user has asked for commits)

```bash
git add supabase/migrations/20261013191000_request_message_notifications.sql
git commit -m "feat(db): notify staff when an applicant writes on a request"
```

---

### Task 3: Shared module, notification builder and the send function

**Files:**
- Create: `src/features/requests/request-messages.ts`
- Create: `src/features/requests/request-messages.server.ts`
- Create: `src/features/requests/request-messages.mutations.ts`
- Modify: `src/features/notifications/notifications.queries.ts:7-18`
- Modify: `src/features/notifications/notifications.server.ts` (add after `buildStatusChangeEmail`)
- Modify: `src/features/notifications/pages/NotificationsPage.tsx:4-18` and `:99-109`

**Interfaces:**
- Consumes: `request_messages`, `services_registry.allows_messages` (Task 1); `dispatchApplicantNotification(supabase, requestId, content)`; `requireActiveSession`; `getSupabaseAdminClient`.
- Produces:
  - `MESSAGE_MAX_LENGTH: number`, `MESSAGE_FLOOD_LIMIT: number`, `MESSAGE_FLOOD_WINDOW_MINUTES: number`
  - `type MessageSenderRole = "applicant" | "staff"`
  - `interface RequestMessage { id: string; senderRole: MessageSenderRole; senderName: string | null; body: string; createdAt: string }`
  - `normalizeMessageBody(raw: unknown): { ok: true; body: string } | { ok: false; message: string }`
  - `isFlooded(recentCount: number): boolean`
  - `readRequestMessages(supabase: SupabaseClient, requestId: string): Promise<RequestMessage[]>`
  - `postRequestMessageFn({ data: { requestId: string; body: string } }): Promise<{ error: true; message: string } | { error: false; id: string }>`
  - `buildNewMessageEmail(trackingNumber: string): NotificationContent`

- [ ] **Step 1: Write the pure module**

Create `src/features/requests/request-messages.ts`. It must have **no imports** and only syntax Node can strip (no enums), so the Node check in Step 2 can load it.

```ts
/** A message body, after trimming, may be 1 to this many characters. */
export const MESSAGE_MAX_LENGTH = 1000;

/** How many messages one sender may post on one request inside the window. */
export const MESSAGE_FLOOD_LIMIT = 10;
export const MESSAGE_FLOOD_WINDOW_MINUTES = 60;

export type MessageSenderRole = "applicant" | "staff";

export interface RequestMessage {
  id: string;
  senderRole: MessageSenderRole;
  /**
   * The sender's name when the viewer is allowed to read it (staff reading a
   * staff message). Null otherwise; the card falls back to a generic label.
   */
  senderName: string | null;
  body: string;
  createdAt: string;
}

export type MessageBodyResult =
  | { ok: true; body: string }
  | { ok: false; message: string };

/**
 * Trims a message and checks its length. The database CHECK is the backstop;
 * this gives the sender a readable reason first. JS counts UTF-16 units, so it
 * is never more lenient than the database's character count.
 */
export function normalizeMessageBody(raw: unknown): MessageBodyResult {
  if (typeof raw !== "string") {
    return { ok: false, message: "Write a message first." };
  }
  const body = raw.replace(/\r\n/g, "\n").trim();
  if (body.length === 0) {
    return { ok: false, message: "Write a message first." };
  }
  if (body.length > MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      message: `Messages can be up to ${MESSAGE_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true, body };
}

/** True once a sender has used up the messages allowed inside the window. */
export function isFlooded(recentCount: number): boolean {
  return recentCount >= MESSAGE_FLOOD_LIMIT;
}
```

- [ ] **Step 2: Check the pure module**

```bash
cd /Users/joshuabulgado/civicheck && node --experimental-strip-types --input-type=module -e "
import assert from 'node:assert/strict';
const m = await import('./src/features/requests/request-messages.ts');
assert.deepEqual(m.normalizeMessageBody('  hi  '), { ok: true, body: 'hi' });
assert.equal(m.normalizeMessageBody('   ').ok, false);
assert.equal(m.normalizeMessageBody('').ok, false);
assert.equal(m.normalizeMessageBody(42).ok, false);
assert.equal(m.normalizeMessageBody(null).ok, false);
assert.equal(m.normalizeMessageBody('x'.repeat(1000)).ok, true);
assert.equal(m.normalizeMessageBody('x'.repeat(1001)).ok, false);
assert.equal(m.normalizeMessageBody('a\r\nb').body, 'a\nb');
assert.equal(m.normalizeMessageBody('  ' + 'x'.repeat(1000) + '  ').ok, true);
assert.equal(m.isFlooded(9), false);
assert.equal(m.isFlooded(10), true);
console.log('request-messages: ok');
"
```
Expected: `request-messages: ok` (a Node experimental-feature warning above it is fine).

- [ ] **Step 3: Write the loader helper**

Create `src/features/requests/request-messages.server.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MessageSenderRole,
  RequestMessage,
} from "~/features/requests/request-messages";

function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

/**
 * Oldest first. Runs under the caller's own RLS, so an applicant only ever
 * gets their own request's thread and staff only their department's.
 *
 * `senderName` comes from the sender's profile; an applicant cannot read staff
 * profiles, so for them it is null and the card shows "CCRO staff".
 */
export async function readRequestMessages(
  supabase: SupabaseClient,
  requestId: string,
): Promise<RequestMessage[]> {
  const { data, error } = await supabase
    .from("request_messages")
    .select("id, sender_role, body, created_at, profiles(first_name, last_name)")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any): RequestMessage => {
    const profile = one<{ first_name?: string | null; last_name?: string | null }>(
      row.profiles,
    );
    const name = profile
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : "";
    return {
      id: row.id,
      senderRole: row.sender_role as MessageSenderRole,
      senderName: name || null,
      body: row.body,
      createdAt: row.created_at,
    };
  });
}
```

- [ ] **Step 4: Add the notification types**

In `src/features/notifications/notifications.queries.ts`, replace the union so it reads:

```ts
export type NotificationType =
  // applicant feed
  | "status_change"
  | "pre_validation_complete"
  | "document_rejected"
  | "message"
  // CCRO personnel feed
  | "new_request"
  | "document_resubmitted"
  | "awaiting_cashier"
  | "ready_to_release"
  | "request_incomplete"
  | "request_rejected"
  | "new_message";
```

In `src/features/notifications/notifications.server.ts`, add directly after `buildStatusChangeEmail`:

```ts
/**
 * The applicant is told a message exists, never what it says: replies cannot
 * be sent by email, so they have to sign in anyway, and this keeps personal
 * details out of inboxes.
 */
export function buildNewMessageEmail(trackingNumber: string): NotificationContent {
  return composeContent(
    "message",
    `Request ${trackingNumber}: new message from CCRO`,
    [`CCRO sent you a message about request ${trackingNumber}.`],
    `open "My Requests" to read and reply.`,
  );
}
```

In `src/features/notifications/pages/NotificationsPage.tsx`, add `MessageSquare` to the lucide import (between `MailWarning` and `MoreHorizontal`) and two entries to `TYPE_STYLE`, after the `request_rejected` line:

```ts
  message: { icon: MessageSquare, unreadClass: "bg-primary text-white" },
  new_message: { icon: MessageSquare, unreadClass: "bg-primary text-white" },
```

- [ ] **Step 5: Write the send function**

Create `src/features/requests/request-messages.mutations.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveSession } from "~/server/auth";
import { hasPermission, isDepartmentScopedRole } from "~/lib/permissions";
import { getSupabaseAdminClient } from "~/utils/supabase";
import {
  buildNewMessageEmail,
  dispatchApplicantNotification,
} from "~/features/notifications/notifications.server";
import {
  MESSAGE_FLOOD_WINDOW_MINUTES,
  isFlooded,
  normalizeMessageBody,
  type MessageSenderRole,
} from "~/features/requests/request-messages";

const postMessageSchema = z.object({
  requestId: z.string().uuid(),
  body: z.string(),
});

function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

// Same wording for a missing request and one the caller may not see, so a
// wrong-department or wrong-applicant request cannot be told apart from none.
const NOT_FOUND = { error: true as const, message: "That request no longer exists." };

/**
 * Posts one message on a request.
 *
 * Clients have no INSERT grant on `request_messages`; this is the only writer.
 * The request is read with the caller's own client, so RLS has already hidden
 * anything they may not see, and the checks below add the rules RLS cannot
 * express (the service switch, walk-ins, the flood limit).
 */
export const postRequestMessageFn = createServerFn({ method: "POST" })
  .validator(postMessageSchema)
  .handler(async ({ data }) => {
    const { supabase, user, role, departmentId } = await requireActiveSession();

    const isApplicant = hasPermission(role, "requests:view_own");
    const isPersonnel = hasPermission(role, "requests:process");
    if (!isApplicant && !isPersonnel) {
      return {
        error: true as const,
        message: "You can't send messages on this request.",
      };
    }
    const senderRole: MessageSenderRole = isApplicant ? "applicant" : "staff";

    const normalized = normalizeMessageBody(data.body);
    if (!normalized.ok) {
      return { error: true as const, message: normalized.message };
    }

    const { data: request, error: fetchError } = await supabase
      .from("requests")
      .select(
        "id, tracking_number, applicant_id, services_registry(allows_messages, department_id)",
      )
      .eq("id", data.requestId)
      .maybeSingle();
    if (fetchError || !request) return NOT_FOUND;

    const service = one<{ allows_messages: boolean; department_id: string | null }>(
      (request as any).services_registry,
    );
    if (!service?.allows_messages) {
      return {
        error: true as const,
        message: "Messages aren't available for this request.",
      };
    }
    // A walk-in has no account, so nobody could read the thread.
    if (!request.applicant_id) {
      return {
        error: true as const,
        message: "This request has no applicant account to message.",
      };
    }

    if (isApplicant) {
      if (request.applicant_id !== user.id) return NOT_FOUND;
    } else if (
      isDepartmentScopedRole(role) &&
      service.department_id !== departmentId
    ) {
      return NOT_FOUND;
    }

    const admin = getSupabaseAdminClient();

    const since = new Date(
      Date.now() - MESSAGE_FLOOD_WINDOW_MINUTES * 60_000,
    ).toISOString();
    const { count, error: countError } = await admin
      .from("request_messages")
      .select("id", { count: "exact", head: true })
      .eq("request_id", request.id)
      .eq("sender_id", user.id)
      .gte("created_at", since);
    if (countError) {
      return {
        error: true as const,
        message: "We couldn't send your message. Please try again.",
      };
    }
    if (isFlooded(count ?? 0)) {
      return {
        error: true as const,
        message:
          "You've sent a lot of messages in a short time. Please wait a while before sending another.",
      };
    }

    const { data: inserted, error: insertError } = await admin
      .from("request_messages")
      .insert({
        request_id: request.id,
        sender_id: user.id,
        sender_role: senderRole,
        body: normalized.body,
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      return {
        error: true as const,
        message: "We couldn't send your message. Please try again.",
      };
    }

    // Applicant messages notify staff through the database trigger. Staff
    // messages notify the applicant here, with the staff member's own client,
    // like every other applicant notification.
    if (senderRole === "staff") {
      await dispatchApplicantNotification(
        supabase,
        request.id,
        buildNewMessageEmail(request.tracking_number),
      );
    }

    return { error: false as const, id: inserted.id as string };
  });
```

- [ ] **Step 6: Type-check**

```bash
cd /Users/joshuabulgado/civicheck && npx tsc --noEmit -p . > /private/tmp/claude-501/-Users-joshuabulgado-civicheck/0fe03d57-ac4b-4d54-b8df-fe0a65b02a1e/scratchpad/tsc.out 2>&1; echo "tsc exit: $?"; tail -20 /private/tmp/claude-501/-Users-joshuabulgado-civicheck/0fe03d57-ac4b-4d54-b8df-fe0a65b02a1e/scratchpad/tsc.out
```
Expected: `tsc exit: 0` and no output. A `Record<NotificationType, …>` error in `NotificationsPage.tsx` means a `TYPE_STYLE` entry is missing.

- [ ] **Step 7: Commit** (only when the user has asked for commits)

```bash
git add src/features/requests/request-messages.ts \
  src/features/requests/request-messages.server.ts \
  src/features/requests/request-messages.mutations.ts \
  src/features/notifications/notifications.queries.ts \
  src/features/notifications/notifications.server.ts \
  src/features/notifications/pages/NotificationsPage.tsx
git commit -m "feat(requests): add the send-message function and message notifications"
```

---

### Task 4: Detail loaders return the switch and the thread

**Files:**
- Modify: `src/features/requests/applicant-requests.queries.ts` (`getMyRequestDetailFn`)
- Modify: `src/features/requests/requests.queries.ts` (`ServiceEmbed`, `getRequestDetailFn`)

**Interfaces:**
- Consumes: `readRequestMessages`, `RequestMessage` (Task 3); `services_registry.allows_messages` (Task 1).
- Produces: both `MyRequestDetail` and `RequestDetail` gain `allowsMessages: boolean` and `messages: RequestMessage[]`.

- [ ] **Step 1: Applicant loader**

In `src/features/requests/applicant-requests.queries.ts`:

1. Add the import:
```ts
import { readRequestMessages } from "~/features/requests/request-messages.server";
```
2. In the `getMyRequestDetailFn` select, add `allows_messages` to the service embed:
```ts
         services_registry(name, display_name, processing_time, departments(name),
           event_date_label, event_place_label, reference_number_label, allows_messages),
```
3. In the `one<{ … }>(row.services_registry)` type literal, add `allows_messages?: boolean;` after `reference_number_label?: string | null;`.
4. After the `if (logs.error) throw …` line, add:
```ts
    const allowsMessages = service?.allows_messages === true;
    const messages = allowsMessages
      ? await readRequestMessages(supabase, data.requestId)
      : [];
```
5. In the returned object, add after `referenceNumberLabel: …,`:
```ts
      allowsMessages,
      messages,
```

- [ ] **Step 2: Staff loader**

In `src/features/requests/requests.queries.ts`:

1. Add the import:
```ts
import { readRequestMessages } from "~/features/requests/request-messages.server";
```
2. Add `allows_messages?: boolean;` to the `ServiceEmbed` type, after `reference_number_label?: string | null;`.
3. In the `getRequestDetailFn` select, add `allows_messages` to the service embed:
```ts
         services_registry(name, display_name, processing_time, department_id, departments(id, name),
           event_date_label, event_place_label, reference_number_label, allows_messages),
```
4. After the `if (logs.error) throw …` line in that function, add:
```ts
    const allowsMessages = service?.allows_messages === true;
    const messages = allowsMessages
      ? await readRequestMessages(supabase, data.requestId)
      : [];
```
5. In the returned object, add after `referenceNumberLabel: …,`:
```ts
      allowsMessages,
      messages,
```

- [ ] **Step 3: Type-check**

Run the same `tsc` command as Task 3, Step 6. Expected: `tsc exit: 0`.

- [ ] **Step 4: Check the loader's data directly**

```sql
select r.id, r.request_type, s.allows_messages
from public.requests r
join public.services_registry s on s.service_code = r.request_type
where r.request_type in ('EMAIL_INQUIRY', 'OTHER_CERT')
order by r.created_at desc limit 4;
```
Expected: rows where `EMAIL_INQUIRY` shows `true` and `OTHER_CERT` shows `false` (or no rows, if no such request exists yet; Task 6 creates one).

- [ ] **Step 5: Commit** (only when the user has asked for commits)

```bash
git add src/features/requests/applicant-requests.queries.ts src/features/requests/requests.queries.ts
git commit -m "feat(requests): load the message thread on both request detail pages"
```

---

### Task 5: The Messages card, on both pages

**Files:**
- Create: `src/features/requests/components/RequestMessagesCard.tsx`
- Modify: `src/features/requests/pages/MyRequestDetailPage.tsx`
- Modify: `src/features/requests/pages/RequestDetailPage.tsx`
- Modify: `src/routes/_authed/_dashboard/my-requests/$requestId.tsx`
- Modify: `src/routes/_authed/_dashboard/requests/$requestId.tsx`

**Interfaces:**
- Consumes: `postRequestMessageFn`, `RequestMessage`, `MessageSenderRole`, `MESSAGE_MAX_LENGTH` (Task 3); `allowsMessages`, `messages` on the loader data (Task 4).
- Produces: `<RequestMessagesCard requestId messages viewer onSent />`.

- [ ] **Step 1: Write the card**

Create `src/features/requests/components/RequestMessagesCard.tsx`:

```tsx
import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { postRequestMessageFn } from "~/features/requests/request-messages.mutations";
import {
  MESSAGE_MAX_LENGTH,
  type MessageSenderRole,
  type RequestMessage,
} from "~/features/requests/request-messages";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface RequestMessagesCardProps {
  requestId: string;
  messages: RequestMessage[];
  /** Who is looking, which decides whose messages read as "You". */
  viewer: MessageSenderRole;
  /** Called after a message is sent, so the route can re-run its loader. */
  onSent: () => void;
}

function senderLabel(message: RequestMessage, viewer: MessageSenderRole) {
  if (message.senderRole === viewer) return "You";
  if (message.senderRole === "applicant") return "Applicant";
  return message.senderName ?? "CCRO staff";
}

export function RequestMessagesCard({
  requestId,
  messages,
  viewer,
  onSent,
}: RequestMessagesCardProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const trimmed = draft.trim();

  async function handleSend() {
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await postRequestMessageFn({
        data: { requestId, body: trimmed },
      });
      if (res.error) {
        toast.error(res.message);
        return;
      }
      setDraft("");
      onSent();
    } catch {
      toast.error("We couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const inputId = `message-draft-${requestId}`;

  return (
    <section className="dashboard-panel p-6">
      <h2 className="mb-1 text-lg font-bold text-foreground">
        {viewer === "applicant" ? "Messages with CCRO" : "Messages with the applicant"}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Don't send passwords or payment details here.
      </p>

      {messages.length === 0 ? (
        <p className="mb-4 text-sm italic text-muted-foreground">
          {viewer === "applicant"
            ? "Have a question about this request? Send a message to CCRO."
            : "No messages yet. Write to the applicant if you need more information."}
        </p>
      ) : (
        <ol className="mb-4 flex flex-col gap-3">
          {messages.map((message) => {
            const mine = message.senderRole === viewer;
            return (
              <li
                key={message.id}
                className={
                  mine
                    ? "rounded-lg border border-primary/25 bg-primary/5 p-3"
                    : "rounded-lg border border-border bg-card p-3"
                }
              >
                <div className="mb-1 flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {senderLabel(message, viewer)}
                  </span>
                  <time dateTime={message.createdAt}>
                    {formatDateTime(message.createdAt)}
                  </time>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                  {message.body}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <label htmlFor={inputId} className="sr-only">
        Message
      </label>
      <Textarea
        id={inputId}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={MESSAGE_MAX_LENGTH}
        rows={3}
        placeholder={
          viewer === "applicant"
            ? "Write your question or reply…"
            : "Write your reply…"
        }
        disabled={sending}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {draft.length} / {MESSAGE_MAX_LENGTH}
        </span>
        <Button onClick={handleSend} disabled={!trimmed || sending}>
          <Send data-icon="inline-start" aria-hidden="true" />
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Applicant page**

In `src/features/requests/pages/MyRequestDetailPage.tsx`, add the import beside the other `~/features/requests/components/…` imports:

```ts
import { RequestMessagesCard } from "~/features/requests/components/RequestMessagesCard";
```

and insert this immediately **before** `<RequestHistoryTimeline` (the one with `audience="applicant"`):

```tsx
          {request.allowsMessages && (
            <RequestMessagesCard
              requestId={request.id}
              messages={request.messages}
              viewer="applicant"
              onSent={onUpdated}
            />
          )}

```

- [ ] **Step 3: Staff page**

In `src/features/requests/pages/RequestDetailPage.tsx`, add the same import and insert this immediately **before** `<RequestHistoryTimeline` (the one with `audience="staff"`):

```tsx
          {request.allowsMessages && !request.isWalkIn && (
            <RequestMessagesCard
              requestId={request.id}
              messages={request.messages}
              viewer="staff"
              onSent={onUpdated}
            />
          )}

```

- [ ] **Step 4: Subscribe both routes**

In **both** `src/routes/_authed/_dashboard/my-requests/$requestId.tsx` and `src/routes/_authed/_dashboard/requests/$requestId.tsx`, change:

```ts
    tables: ["requests", "application_logs", "requirements_attachments"],
```
to:
```ts
    tables: ["requests", "application_logs", "requirements_attachments", "request_messages"],
```

- [ ] **Step 5: Type-check**

Run the same `tsc` command as Task 3, Step 6. Expected: `tsc exit: 0`.

- [ ] **Step 6: Commit** (only when the user has asked for commits)

```bash
git add src/features/requests/components/RequestMessagesCard.tsx \
  src/features/requests/pages/MyRequestDetailPage.tsx \
  src/features/requests/pages/RequestDetailPage.tsx \
  "src/routes/_authed/_dashboard/my-requests/\$requestId.tsx" \
  "src/routes/_authed/_dashboard/requests/\$requestId.tsx"
git commit -m "feat(requests): add the Messages card to the applicant and staff request pages"
```

---

### Task 6: End-to-end verification

**Files:** none changed. This task proves the whole thread works, using two browser sessions (an applicant and a staff member of the `archives` department, which owns `EMAIL_INQUIRY`).

- [ ] **Step 1: Create a throwaway request**

Sign in as an applicant and submit an `EMAIL_INQUIRY` request at `/apply/email-inquiry`. Note the tracking number. Do this with a test account, not a real person's.

- [ ] **Step 2: Applicant sends the first message**

Open the request at `/my-requests/<id>`.
Expected: a "Messages with CCRO" card with the empty-state text. Send "test question 1".
Expected: the message appears in the list as "You", the counter resets, and no error toast.

- [ ] **Step 3: Staff sees it, and was notified**

In the second session, sign in as an `archives` staff member.
Expected: an unread notification "Request <tracking>: new message" in the notification feed; opening it lands on the request; the card "Messages with the applicant" shows "Applicant: test question 1".

- [ ] **Step 4: Staff replies, applicant is notified**

Send "test reply 1" as staff.
Expected: the applicant's page updates **without a reload** (realtime) to show "CCRO staff: test reply 1"; the applicant's notification feed has "Request <tracking>: new message from CCRO"; the email (check the Resend log or the test inbox) says there is a new message and **does not contain "test reply 1"**.

- [ ] **Step 5: The thread survives the end of the request**

As staff, move the request through to `released` (or `rejected`).
Expected: the applicant can still send a message and staff still receive it.

- [ ] **Step 6: Isolation (Review Focus 1)**

Sign in as a *different* applicant and open `/my-requests/<that id>`.
Expected: not found, no messages. Then, in the browser console of that session, call the send function with the first applicant's request id.
Expected: `That request no longer exists.` and no row is created.

Also sign in as staff of a **different department** and open `/requests/<that id>`.
Expected: not found.

- [ ] **Step 7: The switch (Review Focus 3)**

Run: `update public.services_registry set allows_messages = false where service_code = 'EMAIL_INQUIRY';`
Expected: reloading both pages shows no Messages card, and sending from an open tab returns `Messages aren't available for this request.`

Restore it: `update public.services_registry set allows_messages = true where service_code = 'EMAIL_INQUIRY';`
Expected: the card is back.

- [ ] **Step 8: Limits (Review Focus 4)**

As the applicant, try: an empty message (Send is disabled), 1001 pasted characters (the box stops at 1000), then 11 quick messages.
Expected: the 11th is rejected with the "wait a while" message.

- [ ] **Step 9: Clean up and final check**

```sql
select count(*) from public.request_messages where body like 'test %';
```
Test messages are immutable by design. Leave them on the throwaway request (it is the test account's), or remove them with the service role in a scratch SQL session if they must go: `delete from public.request_messages where request_id = '<throwaway id>';`

Run the Task 3, Step 6 `tsc` command once more.
Expected: `tsc exit: 0`.

- [ ] **Step 10: Report**

State, for each Review Focus line, what was observed. If any step failed, say which and stop; do not mark the plan done.

---

## Not in this plan

- ~~**The admin on/off toggle**~~ **Done as Task 7 (added during execution).** `save_service_configuration` (`20261013120000_add_save_service_configuration.sql`) was applied first, with two small `allows_messages` lines added to it. The toggle touches `service-configuration.schema.ts` (optional boolean), `services.types.ts`, `service-form.config.ts`, `ServiceFormPage.tsx` and a checkbox in `CaseQuestionsSection.tsx`. A save that omits the key keeps the current value.
- **Email Inquiry service content** (case questions, Authorization Letter gating, `where_to_secure`, the "ready for release" wording). Spec §5, piece 1: a separate bounded change, done first or after, same pattern as the earlier case-question migrations.
- **A `CLAUDE.md` §5 entry** for request messages, which the spec says should follow once this ships. That file is project instructions, so the owner decides.
