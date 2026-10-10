# Staff & Admin Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give staff, supervisors, cashiers and admins an in-system notification feed (with unread badge) that only alerts a role about events it must act on, and let the cashier confirm fee-free requests with a checkbox instead of an OR number.

**Architecture:** A new `staff_notifications` table (one row per recipient, RLS `recipient_id = auth.uid()`) is filled by security-definer Postgres triggers on `requests` and `requirements_attachments`. The four existing notification server functions dispatch by role to either the applicant feed or the new table, so the existing `/notifications` route, page, sidebar item and badge are reused. Fee-free confirmation reuses `verifyPaymentFn` and `payment_status = 'verified'`.

**Tech Stack:** Supabase Postgres 17 (RLS, triggers, Realtime), TanStack Start server functions, React 18, shadcn/base-ui, TypeScript, lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-10-staff-admin-notifications-design.md` (read it first; the plan implements it section by section).

## Global Constraints

- Stack is fixed: React, TanStack Start, Tailwind v3, shadcn/ui, Supabase. No separate backend server.
- Notifications are **in-system only**: no email to staff or admin (`CLAUDE.md` §5.6).
- `notifications:view_staff` is granted to `staff`, `supervisor`, `cashier`, `admin` only. Never `applicant`, never `system_admin`.
- The workflow has four stages and the seven `requests.status` codes in `CLAUDE.md` §4. There is no approval stage; do not add one.
- One `/notifications` route and no per-role route files (`CLAUDE.md` §8). Role differences live in the loader and components.
- The applicant `notifications` table, its email outbox and `dispatchApplicantNotification` are not modified.
- Only active accounts (`profiles.access_status = 'active'`) are notified; the actor is never notified of their own action; only real transitions notify.
- Fan-out must never block the originating write: trigger functions swallow and log their own errors.
- Fee-free is decided from the stored `requests.fees_due <= 0`, never from client input. `or_number` stays nullable.
- The repo has **no test runner** and this work does not add one. Verification is (a) SQL assertion scripts run inside `begin; … rollback;`, (b) `pnpm exec tsc --noEmit` with no new errors versus baseline, (c) a Playwright pass per role.
- **Do not apply migrations to the live project (`kfzpoemvrajrkqsufnmb`) without the user's explicit approval** (Task 9). Tasks 1–2 only run migrations inside a transaction that is rolled back.
- The current git branch has unrelated uncommitted work. Before the first commit, confirm with the user which branch to commit on.
- Copy: titles carry the tracking number; plain text only (no HTML) in the feed.

## Review Focus

Failure modes the spec implies but the happy-path tasks would not catch, most likely first:

1. **Department with no active staff** (`death` and `archives` have none today): submitting a request there must still succeed and create zero `new_request` rows, not error. Pinned by Task 2 test T11.
2. **A failing notification must not fail the user's action**: if the insert into `staff_notifications` errors, the applicant's submission / cashier's confirmation still commits. Pinned by Task 2 test T12.
3. **Noise and double-fire**: updating `updated_at` or re-writing the same value, and the legacy single update that sets `status = 'released'` and `payment_status = 'verified'` together, must not notify; re-entering `ready_for_release` must. Pinned by Task 2 tests T3, T7, T9.
4. **Cashier deep link**: the cashier lacks `requests:view_all`, so a notification must open `/cashier?tracking=…` (auto-lookup), never `/requests/$id`. Pinned by Task 6 target mapping and Task 7 route/search handling.
5. **Admin sidebar silently drops items not listed in `ROLE_GROUP_LAYOUTS`**, and applicants must keep their own feed. Pinned by Task 8 and Task 9 manual pass.

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20261010120000_add_staff_notifications.sql` (create) | Table, indexes, RLS, grants, realtime publication |
| `supabase/migrations/20261010121000_add_staff_notification_triggers.sql` (create) | Fan-out function, label helper, four trigger functions, four triggers |
| `supabase/tests/staff_notifications_rls.test.sql` (create) | RLS/grant assertions for the table |
| `supabase/tests/staff_notification_triggers.test.sql` (create) | Trigger/recipient assertions |
| `src/features/notifications/notification-audience.ts` (create) | Pure `role → "applicant" \| "staff" \| null` helper shared by route, shell and server functions |
| `src/lib/permissions.ts` (modify) | `notifications:view_staff` |
| `docs/RBAC.md` (modify) | Document the permission |
| `src/features/requests/request-workflow.ts` (modify) | `isPaymentSettled` no longer treats free as settled |
| `src/features/requests/requests.mutations.ts` (modify) | Fee-free confirmation in `verifyPaymentFn`; drop auto-verify on release |
| `src/features/requests/components/PaymentVerificationPanel.tsx` (modify) | Fee-free checkbox UI |
| `src/features/requests/pages/RequestDetailPage.tsx` (modify) | New `isPaymentSettled` call; copy |
| `src/features/notifications/notifications.queries.ts` (rewrite) | Role-dispatching feed + unread count; `NotificationTarget` |
| `src/features/notifications/notifications.mutations.ts` (rewrite) | Role-dispatching read/archive actions |
| `src/features/notifications/pages/NotificationsPage.tsx` (modify) | Audience copy, new type icons, per-row link target |
| `src/routes/_authed/_dashboard/notifications.tsx` (rewrite) | Guard accepts either audience; realtime table by audience |
| `src/routes/_authed/_dashboard/cashier.tsx` (modify) | `tracking` search param |
| `src/features/cashier/components/CashierCounter.tsx` (modify) | Auto-lookup from `initialTracking` |
| `src/routes/_authed/_dashboard/route.tsx` (modify) | Unread count + realtime for staff roles |
| `src/components/sidebar-01/app-sidebar.tsx` (modify) | Notifications item for staff roles; admin layout entry |

## SQL test runner (used by Tasks 1, 2 and 9)

There is no Supabase CLI or `psql` here; SQL runs through the Supabase MCP `execute_sql` tool against project `kfzpoemvrajrkqsufnmb`. Every run is wrapped so nothing persists:

```bash
SCRATCH="${TMPDIR:-/tmp}"
cd /Users/joshuabulgado/civicheck
# usage: assemble OUT file1 file2 ...
assemble() { out="$1"; shift; { echo "begin;"; for f in "$@"; do cat "$f"; echo; done; echo "rollback;"; } > "$out"; }
```

Then `Read` the assembled file and pass its **entire contents** as `query` to `mcp__plugin_supabase_supabase__execute_sql` (load it with ToolSearch `select:mcp__plugin_supabase_supabase__execute_sql` if it is deferred). A failed `assert` aborts the call with an error; a clean return means every assertion passed. After any run, confirm nothing leaked:

```sql
select to_regclass('public.staff_notifications') as table_present,
       (select count(*) from pg_trigger where tgname like 'notify_%') as leaked_triggers;
```

Expected before Task 9 approval: `table_present` null and `leaked_triggers` 0.

---

### Task 1: `staff_notifications` table, RLS and realtime

**Files:**
- Create: `supabase/migrations/20261010120000_add_staff_notifications.sql`
- Create: `supabase/tests/staff_notifications_rls.test.sql`

**Interfaces:**
- Produces: table `public.staff_notifications(id, recipient_id, request_id, tracking_number, type, title, body, is_read, read_at, archived_at, created_at)`; `authenticated` may `select` own rows and `update (is_read, read_at, archived_at)` on own rows only; no insert/delete for `authenticated`/`anon`; table is in the `supabase_realtime` publication. `type` ∈ `new_request | document_resubmitted | awaiting_cashier | ready_to_release | request_incomplete | request_rejected`.

- [ ] **Step 1: Prove the transaction wrapper really rolls back**

Run through `execute_sql`:

```sql
begin;
create table public._tx_probe (x int);
rollback;
```

Then run `select to_regclass('public._tx_probe') as probe;`.
Expected: `probe` is `null`. If it is not null, drop it (`drop table public._tx_probe;`) and **stop**: the wrapper does not roll back, so do not run any further test script against the live project; ask the user for a Supabase branch instead.

- [ ] **Step 2: Write the failing RLS test**

Create `supabase/tests/staff_notifications_rls.test.sql`:

```sql
-- Runs inside begin; …; rollback; with 20261010120000 applied first.
-- Any failed assert aborts the whole run.

do $$
declare
  v_a uuid;
  v_b uuid;
  v_applicant uuid;
  v_req uuid;
begin
  select id into v_a from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active'
  order by id limit 1;
  select id into v_b from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active' and id <> v_a
  order by id limit 1;
  select id into v_applicant from public.profiles
  where role = 'applicant' and access_status = 'active' limit 1;
  assert v_a is not null and v_b is not null and v_applicant is not null,
    'fixture: need two active staff and one active applicant';

  insert into public.requests (tracking_number, applicant_id, request_type)
  select 'TEST-' || gen_random_uuid(), v_applicant, service_code
  from public.services_registry order by service_code limit 1
  returning id into v_req;

  insert into public.staff_notifications
    (recipient_id, request_id, tracking_number, type, title, body)
  values
    (v_a, v_req, 'TEST-A', 'new_request', 'for a', 'body a'),
    (v_b, v_req, 'TEST-B', 'new_request', 'for b', 'body b');

  perform set_config('t.a', v_a::text, true);
  perform set_config('t.b', v_b::text, true);
  perform set_config('t.req', v_req::text, true);
end $$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('t.a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  n int;
begin
  -- 1. A recipient sees only their own rows.
  select count(*) into n from public.staff_notifications;
  assert n = 1, format('recipient should see exactly 1 row, saw %s', n);

  -- 2. They can mark their own row read and archive it.
  update public.staff_notifications
  set is_read = true, read_at = now(), archived_at = now()
  where recipient_id = current_setting('t.a')::uuid;
  get diagnostics n = row_count;
  assert n = 1, 'recipient should be able to update read/archive state';

  -- 3. They cannot rewrite the content.
  begin
    update public.staff_notifications set title = 'tampered'
    where recipient_id = current_setting('t.a')::uuid;
    raise exception 'content update should have been denied';
  exception when insufficient_privilege then null;
  end;

  -- 4. They cannot insert (only triggers write).
  begin
    insert into public.staff_notifications
      (recipient_id, request_id, tracking_number, type, title, body)
    values (current_setting('t.a')::uuid, current_setting('t.req')::uuid,
            'TEST-X', 'new_request', 'x', 'x');
    raise exception 'insert should have been denied';
  exception when insufficient_privilege then null;
  end;

  -- 5. They cannot delete.
  begin
    delete from public.staff_notifications;
    raise exception 'delete should have been denied';
  exception when insufficient_privilege then null;
  end;

  -- 6. Another recipient's row is invisible and untouchable (0 rows, no error).
  update public.staff_notifications set is_read = true
  where recipient_id = current_setting('t.b')::uuid;
  get diagnostics n = row_count;
  assert n = 0, 'must not be able to touch another recipient''s row';
end $$;

reset role;

-- 7. Realtime publication includes the table.
do $$
begin
  assert exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'staff_notifications'
  ), 'staff_notifications must be in the supabase_realtime publication';
end $$;
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
assemble "$SCRATCH/run-rls.sql" supabase/tests/staff_notifications_rls.test.sql
```

Execute `$SCRATCH/run-rls.sql` via `execute_sql`.
Expected: ERROR `relation "public.staff_notifications" does not exist`.

- [ ] **Step 4: Write the migration**

Create `supabase/migrations/20261010120000_add_staff_notifications.sql`:

```sql
-- In-system notifications for CCRO personnel (staff, supervisor, cashier,
-- admin). One row per recipient, written only by the fan-out triggers in
-- 20261010121000. The applicant `notifications` table is untouched: it is also
-- the email outbox and its policies hang off request ownership.

create table public.staff_notifications (
  id              uuid primary key default gen_random_uuid(),
  recipient_id    uuid not null references public.profiles(id) on delete cascade,
  request_id      uuid not null references public.requests(id) on delete cascade,
  -- Denormalized so the feed label and the cashier deep link never depend on
  -- the reader still having RLS access to the request row.
  tracking_number text not null,
  type            text not null,
  title           text not null,
  body            text not null,
  is_read         boolean not null default false,
  read_at         timestamptz,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  constraint staff_notifications_type_check check (type in (
    'new_request',
    'document_resubmitted',
    'awaiting_cashier',
    'ready_to_release',
    'request_incomplete',
    'request_rejected'
  ))
);

create index staff_notifications_recipient_idx
  on public.staff_notifications (recipient_id, created_at desc);
create index staff_notifications_unread_idx
  on public.staff_notifications (recipient_id) where not is_read;
create index staff_notifications_request_idx
  on public.staff_notifications (request_id);

alter table public.staff_notifications enable row level security;

-- Nothing but the security-definer fan-out writes rows. Recipients may read
-- their own rows and flip the three state columns, nothing else.
revoke all on public.staff_notifications from anon, authenticated;
grant select on public.staff_notifications to authenticated;
grant update (is_read, read_at, archived_at) on public.staff_notifications to authenticated;
grant all on public.staff_notifications to service_role;

create policy "Recipients can view own staff notifications"
  on public.staff_notifications for select to authenticated
  using (
    recipient_id = (select auth.uid())
    and (select public.is_active_user())
  );

create policy "Recipients can update own staff notifications"
  on public.staff_notifications for update to authenticated
  using (
    recipient_id = (select auth.uid())
    and (select public.is_active_user())
  )
  with check (recipient_id = (select auth.uid()));

comment on table public.staff_notifications is
  'In-system notification feed for CCRO personnel; one row per recipient, written by triggers.';

-- Realtime delivers each event only to subscribers whose own RLS allows the row.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'staff_notifications'
  ) then
    alter publication supabase_realtime add table public.staff_notifications;
  end if;
end
$$;
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
assemble "$SCRATCH/run-rls.sql" \
  supabase/migrations/20261010120000_add_staff_notifications.sql \
  supabase/tests/staff_notifications_rls.test.sql
```

Execute via `execute_sql`. Expected: returns with no error. Then run the leak check from the runner section; expected `table_present` null.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261010120000_add_staff_notifications.sql supabase/tests/staff_notifications_rls.test.sql
git commit -m "feat(notifications): add staff_notifications table with RLS"
```

---

### Task 2: Fan-out function and triggers

> **Execution addendum (2026-10-10):** two automated security reviews of this task's commit found that applicants and department staff can write `requests` / `requirements_attachments` columns directly through the API. The migration and tests were hardened during execution: tracking-number format guard, catalog-only requirement names, unread de-duplication, and actor-role gates (spec §5, tests T15–T18). The SQL blocks below are the original design; the files under `supabase/` are authoritative.

**Files:**
- Create: `supabase/migrations/20261010121000_add_staff_notification_triggers.sql`
- Create: `supabase/tests/staff_notification_triggers.test.sql`

**Interfaces:**
- Consumes: `public.staff_notifications` from Task 1.
- Produces: `public.notify_internal_recipients(p_request_id uuid, p_type text, p_title text, p_body text, p_roles text[], p_department_scoped boolean) returns void` (execute revoked from all client roles); triggers `notify_request_submitted`, `notify_request_status_changed`, `notify_request_payment_verified` on `public.requests` and `notify_document_resubmitted` on `public.requirements_attachments`. Titles are `Request <tracking>: <what>`.

- [ ] **Step 1: Write the failing trigger test**

Create `supabase/tests/staff_notification_triggers.test.sql`:

```sql
-- Runs inside begin; …; rollback; with both migrations applied.
-- Fixtures are derived from live data so no accounts are created.

create function pg_temp.new_request(p_service text, p_fee numeric)
returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into public.requests (tracking_number, applicant_id, request_type, status, fees_due)
  values ('TEST-' || gen_random_uuid(), current_setting('t.applicant')::uuid, p_service, 'submitted', p_fee)
  returning id into v;
  return v;
end $$;

create function pg_temp.n(p_req uuid, p_type text) returns int
language sql as $$
  select count(*)::int from public.staff_notifications
  where request_id = p_req and type = p_type
$$;

do $$
declare
  v_dept text; v_service text; v_applicant uuid; v_a uuid; v_b uuid;
begin
  select department_id into v_dept from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active' and department_id is not null
  group by department_id having count(*) >= 2
  order by count(*) desc limit 1;
  assert v_dept is not null, 'fixture: need a department with >= 2 active staff/supervisors';

  select service_code into v_service from public.services_registry
  where department_id = v_dept order by service_code limit 1;
  assert v_service is not null, 'fixture: department has no service';

  select id into v_applicant from public.profiles
  where role = 'applicant' and access_status = 'active' limit 1;
  assert v_applicant is not null, 'fixture: need an active applicant';

  select id into v_a from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active' and department_id = v_dept
  order by id limit 1;
  select id into v_b from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active' and department_id = v_dept and id <> v_a
  order by id limit 1;

  perform set_config('t.dept', v_dept, true);
  perform set_config('t.service', v_service, true);
  perform set_config('t.applicant', v_applicant::text, true);
  perform set_config('t.a', v_a::text, true);
  perform set_config('t.b', v_b::text, true);
end $$;

-- T1: new_request reaches exactly the active staff/supervisors of the department.
do $$
declare v uuid; expected int; got int; tracking text;
begin
  v := pg_temp.new_request(current_setting('t.service'), 150);
  perform set_config('t.req', v::text, true);

  select count(*) into expected from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active'
    and department_id = current_setting('t.dept');
  got := pg_temp.n(v, 'new_request');
  assert got = expected, format('T1 new_request rows: expected %s got %s', expected, got);

  assert not exists (
    select 1 from public.staff_notifications n
    join public.profiles p on p.id = n.recipient_id
    where n.request_id = v
      and (p.access_status <> 'active'
           or p.department_id is distinct from current_setting('t.dept')
           or p.role not in ('staff', 'supervisor'))
  ), 'T1 notified someone inactive / outside the department / wrong role';

  select tracking_number into tracking from public.requests where id = v;
  assert not exists (
    select 1 from public.staff_notifications
    where request_id = v and (title not like '%' || tracking || '%' or tracking_number <> tracking)
  ), 'T1 title and tracking_number must carry the tracking number';
end $$;

-- T2: the actor is never notified of their own action.
do $$
declare v uuid;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('t.a'), 'role', 'authenticated')::text, true);
  v := pg_temp.new_request(current_setting('t.service'), 0);
  perform set_config('request.jwt.claims', '', true);

  assert not exists (
    select 1 from public.staff_notifications
    where request_id = v and recipient_id = current_setting('t.a')::uuid
  ), 'T2 actor was notified of their own action';
  assert exists (
    select 1 from public.staff_notifications
    where request_id = v and recipient_id = current_setting('t.b')::uuid
  ), 'T2 peer in the same department should have been notified';
end $$;

-- T3: writes that are not transitions notify nobody.
do $$
declare v uuid := current_setting('t.req')::uuid; before_n int; after_n int;
begin
  select count(*) into before_n from public.staff_notifications;
  update public.requests set updated_at = now() where id = v;
  update public.requests set status = status where id = v;
  update public.requests set payment_status = payment_status where id = v;
  select count(*) into after_n from public.staff_notifications;
  assert before_n = after_n, format('T3 non-transition updates created %s rows', after_n - before_n);
end $$;

-- T4: ready_for_release with a fee -> every active cashier, payment wording.
do $$
declare v uuid := current_setting('t.req')::uuid; cashiers int;
begin
  select count(*) into cashiers from public.profiles
  where role = 'cashier' and access_status = 'active';
  assert cashiers > 0, 'fixture: need an active cashier';

  update public.requests set status = 'ready_for_release' where id = v;

  assert pg_temp.n(v, 'awaiting_cashier') = cashiers,
    format('T4 awaiting_cashier rows: expected %s got %s', cashiers, pg_temp.n(v, 'awaiting_cashier'));
  assert not exists (
    select 1 from public.staff_notifications n join public.profiles p on p.id = n.recipient_id
    where n.request_id = v and n.type = 'awaiting_cashier' and p.role <> 'cashier'
  ), 'T4 awaiting_cashier reached a non-cashier';
  assert exists (
    select 1 from public.staff_notifications
    where request_id = v and type = 'awaiting_cashier' and title like '%payment verification%'
  ), 'T4 fee request should say "payment verification"';
end $$;

-- T5: ready_for_release with no fee still goes to the cashier, fee-free wording.
do $$
declare v uuid;
begin
  v := pg_temp.new_request(current_setting('t.service'), 0);
  update public.requests set status = 'ready_for_release' where id = v;
  assert exists (
    select 1 from public.staff_notifications
    where request_id = v and type = 'awaiting_cashier' and title like '%fee-free confirmation%'
  ), 'T5 fee-free request should say "fee-free confirmation"';
end $$;

-- T6: payment verified -> every active admin, not cashiers.
do $$
declare v uuid := current_setting('t.req')::uuid; admins int;
begin
  select count(*) into admins from public.profiles
  where role = 'admin' and access_status = 'active';
  assert admins > 0, 'fixture: need an active admin';

  update public.requests set payment_status = 'verified', or_number = 'TEST-OR-' || gen_random_uuid()
  where id = v;

  assert pg_temp.n(v, 'ready_to_release') = admins,
    format('T6 ready_to_release rows: expected %s got %s', admins, pg_temp.n(v, 'ready_to_release'));
  assert not exists (
    select 1 from public.staff_notifications n join public.profiles p on p.id = n.recipient_id
    where n.request_id = v and n.type = 'ready_to_release' and p.role <> 'admin'
  ), 'T6 ready_to_release reached a non-admin';
end $$;

-- T7: re-entering ready_for_release is a new event and notifies again.
do $$
declare v uuid := current_setting('t.req')::uuid; cashiers int; before_n int;
begin
  select count(*) into cashiers from public.profiles where role = 'cashier' and access_status = 'active';
  before_n := pg_temp.n(v, 'awaiting_cashier');
  update public.requests set status = 'processing' where id = v;
  update public.requests set status = 'ready_for_release' where id = v;
  assert pg_temp.n(v, 'awaiting_cashier') = before_n + cashiers, 'T7 re-entry should notify cashiers again';
end $$;

-- T8: incomplete and rejected go to admins with their own types.
do $$
declare v uuid; admins int;
begin
  select count(*) into admins from public.profiles where role = 'admin' and access_status = 'active';
  v := pg_temp.new_request(current_setting('t.service'), 0);
  update public.requests set status = 'incomplete' where id = v;
  assert pg_temp.n(v, 'request_incomplete') = admins, 'T8 incomplete should notify each admin';
  update public.requests set status = 'rejected' where id = v;
  assert pg_temp.n(v, 'request_rejected') = admins, 'T8 rejected should notify each admin';
end $$;

-- T9: the legacy single update (released + verified together) must not alert admins.
do $$
declare v uuid;
begin
  v := pg_temp.new_request(current_setting('t.service'), 0);
  update public.requests set status = 'ready_for_release' where id = v;
  update public.requests set status = 'released', payment_status = 'verified' where id = v;
  assert pg_temp.n(v, 'ready_to_release') = 0, 'T9 released+verified must not create ready_to_release';
end $$;

-- T10: only a rejected -> pending resubmission notifies department staff.
do $$
declare v uuid := current_setting('t.req')::uuid; expected int; a uuid;
begin
  select count(*) into expected from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active'
    and department_id = current_setting('t.dept');

  insert into public.requirements_attachments (request_id, requirement_name, file_url, verification_status)
  values (v, 'TEST requirement', 'test/path.pdf', 'rejected')
  returning id into a;
  assert pg_temp.n(v, 'document_resubmitted') = 0, 'T10 inserting a rejected doc must not notify';

  update public.requirements_attachments set verification_status = 'pending' where id = a;
  assert pg_temp.n(v, 'document_resubmitted') = expected,
    format('T10 resubmission rows: expected %s got %s', expected, pg_temp.n(v, 'document_resubmitted'));

  update public.requirements_attachments set verification_status = 'approved' where id = a;
  assert pg_temp.n(v, 'document_resubmitted') = expected, 'T10 approving must not notify again';
end $$;

-- T11: a department with no active staff still lets the request through, notifying nobody.
do $$
declare v_service text; v uuid;
begin
  select s.service_code into v_service from public.services_registry s
  where not exists (
    select 1 from public.profiles p
    where p.department_id = s.department_id
      and p.role in ('staff', 'supervisor') and p.access_status = 'active'
  )
  order by s.service_code limit 1;

  if v_service is null then
    raise notice 'T11 skipped: every department currently has active staff';
    return;
  end if;

  v := pg_temp.new_request(v_service, 0);
  assert pg_temp.n(v, 'new_request') = 0, 'T11 unstaffed department must produce no rows';
end $$;

-- T12: a failing notification insert must not fail the originating write.
do $$
declare v uuid;
begin
  alter table public.staff_notifications
    add constraint t_force_fail check (false) not valid;

  v := pg_temp.new_request(current_setting('t.service'), 0);  -- must not raise
  assert exists (select 1 from public.requests where id = v), 'T12 request must still be inserted';
  assert pg_temp.n(v, 'new_request') = 0, 'T12 forced failure should leave no notification rows';

  alter table public.staff_notifications drop constraint t_force_fail;
end $$;

-- T13: deleting a request removes its notifications.
do $$
declare v uuid := current_setting('t.req')::uuid;
begin
  assert (select count(*) from public.staff_notifications where request_id = v) > 0, 'T13 precondition';
  delete from public.requests where id = v;
  assert (select count(*) from public.staff_notifications where request_id = v) = 0,
    'T13 notifications must cascade with the request';
end $$;

-- T14: client roles cannot call the fan-out function directly.
set local role authenticated;
do $$
begin
  begin
    perform public.notify_internal_recipients(
      gen_random_uuid(), 'new_request', 't', 'b', array['staff'], false);
    raise exception 'authenticated must not be able to execute notify_internal_recipients';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
assemble "$SCRATCH/run-triggers.sql" \
  supabase/migrations/20261010120000_add_staff_notifications.sql \
  supabase/tests/staff_notification_triggers.test.sql
```

Execute via `execute_sql`. Expected: ERROR from `T1 new_request rows: expected N got 0` (no triggers exist yet).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20261010121000_add_staff_notification_triggers.sql`:

```sql
-- Fan-out for staff_notifications. Everything here runs as the function owner
-- (security definer) because the events are caused by the applicant or the
-- cashier, who have no INSERT right on staff_notifications by design.
--
-- Every trigger function wraps its work in an exception handler: a failed
-- notification must never roll back the submission, status change or payment
-- confirmation that caused it.

create or replace function public.notification_service_label(p_service_code text)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select coalesce(nullif(s.display_name, ''), s.name)
     from public.services_registry s
     where s.service_code = p_service_code),
    p_service_code
  );
$$;

create or replace function public.notify_internal_recipients(
  p_request_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_roles text[],
  p_department_scoped boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tracking text;
  v_department text;
begin
  select r.tracking_number, s.department_id
    into v_tracking, v_department
  from public.requests r
  left join public.services_registry s on s.service_code = r.request_type
  where r.id = p_request_id;

  if v_tracking is null then
    return;
  end if;
  -- A service with no department matches nobody, never everybody.
  if p_department_scoped and v_department is null then
    return;
  end if;

  insert into public.staff_notifications
    (recipient_id, request_id, tracking_number, type, title, body)
  select p.id, p_request_id, v_tracking, p_type, p_title, p_body
  from public.profiles p
  where p.role = any (p_roles)
    and p.access_status = 'active'
    and p.id is distinct from auth.uid()
    and (not p_department_scoped or p.department_id = v_department);
end;
$$;

-- ─── requests: submitted ────────────────────────────────────────────────────

create or replace function public.trg_notify_request_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.notify_internal_recipients(
      new.id,
      'new_request',
      format('Request %s: new request', new.tracking_number),
      format('%s was submitted.', public.notification_service_label(new.request_type)),
      array['staff', 'supervisor'],
      true
    );
  exception when others then
    raise warning 'staff notification (new_request) failed for request %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

-- ─── requests: status changed ───────────────────────────────────────────────

create or replace function public.trg_notify_request_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text := public.notification_service_label(new.request_type);
  v_free boolean := coalesce(new.fees_due, 0) <= 0;
begin
  begin
    if new.status = 'ready_for_release' then
      perform public.notify_internal_recipients(
        new.id,
        'awaiting_cashier',
        case when v_free
          then format('Request %s: ready for fee-free confirmation', new.tracking_number)
          else format('Request %s: ready for payment verification', new.tracking_number)
        end,
        case when v_free
          then format('%s — no fee is due. Confirm it at the counter.', v_label)
          else format('%s — fee due ₱%s.', v_label, to_char(new.fees_due, 'FM999,999,990.00'))
        end,
        array['cashier'],
        false
      );
    elsif new.status = 'incomplete' then
      perform public.notify_internal_recipients(
        new.id,
        'request_incomplete',
        format('Request %s: marked incomplete', new.tracking_number),
        format('%s was marked incomplete and is waiting on the applicant.', v_label),
        array['admin'],
        false
      );
    elsif new.status = 'rejected' then
      perform public.notify_internal_recipients(
        new.id,
        'request_rejected',
        format('Request %s: rejected', new.tracking_number),
        format('%s was rejected.', v_label),
        array['admin'],
        false
      );
    end if;
  exception when others then
    raise warning 'staff notification (status %) failed for request %: %', new.status, new.id, sqlerrm;
  end;
  return null;
end;
$$;

-- ─── requests: payment verified / fee-free confirmed ────────────────────────

create or replace function public.trg_notify_request_payment_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free boolean := coalesce(new.fees_due, 0) <= 0;
begin
  begin
    perform public.notify_internal_recipients(
      new.id,
      'ready_to_release',
      case when v_free
        then format('Request %s: fee-free request confirmed', new.tracking_number)
        else format('Request %s: payment verified', new.tracking_number)
      end,
      format('%s is ready to be released.', public.notification_service_label(new.request_type)),
      array['admin'],
      false
    );
  exception when others then
    raise warning 'staff notification (payment verified) failed for request %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

-- ─── attachments: rejected document resubmitted ─────────────────────────────

create or replace function public.trg_notify_document_resubmitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tracking text;
begin
  begin
    select tracking_number into v_tracking from public.requests where id = new.request_id;
    perform public.notify_internal_recipients(
      new.request_id,
      'document_resubmitted',
      format('Request %s: document resubmitted', v_tracking),
      format('"%s" was resubmitted after rejection and needs review.', new.requirement_name),
      array['staff', 'supervisor'],
      true
    );
  exception when others then
    raise warning 'staff notification (document resubmitted) failed for attachment %: %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

-- ─── triggers ───────────────────────────────────────────────────────────────

drop trigger if exists notify_request_submitted on public.requests;
create trigger notify_request_submitted
  after insert on public.requests
  for each row
  when (new.status = 'submitted')
  execute function public.trg_notify_request_submitted();

drop trigger if exists notify_request_status_changed on public.requests;
create trigger notify_request_status_changed
  after update of status on public.requests
  for each row
  when (old.status is distinct from new.status)
  execute function public.trg_notify_request_status_changed();

-- Only while the request is awaiting release: the legacy path that set
-- status = 'released' and payment_status = 'verified' together must not alert
-- the admin about a document that has already left the counter.
drop trigger if exists notify_request_payment_verified on public.requests;
create trigger notify_request_payment_verified
  after update of payment_status on public.requests
  for each row
  when (
    old.payment_status is distinct from new.payment_status
    and new.payment_status = 'verified'
    and new.status = 'ready_for_release'
  )
  execute function public.trg_notify_request_payment_verified();

drop trigger if exists notify_document_resubmitted on public.requirements_attachments;
create trigger notify_document_resubmitted
  after update of verification_status on public.requirements_attachments
  for each row
  when (old.verification_status = 'rejected' and new.verification_status = 'pending')
  execute function public.trg_notify_document_resubmitted();

-- ─── lock the functions down ────────────────────────────────────────────────
-- Triggers fire regardless of EXECUTE rights; nobody should call these directly.

revoke execute on function public.notification_service_label(text) from public, anon, authenticated;
revoke execute on function public.notify_internal_recipients(uuid, text, text, text, text[], boolean)
  from public, anon, authenticated;
revoke execute on function public.trg_notify_request_submitted() from public, anon, authenticated;
revoke execute on function public.trg_notify_request_status_changed() from public, anon, authenticated;
revoke execute on function public.trg_notify_request_payment_verified() from public, anon, authenticated;
revoke execute on function public.trg_notify_document_resubmitted() from public, anon, authenticated;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
assemble "$SCRATCH/run-triggers.sql" \
  supabase/migrations/20261010120000_add_staff_notifications.sql \
  supabase/migrations/20261010121000_add_staff_notification_triggers.sql \
  supabase/tests/staff_notification_triggers.test.sql
```

Execute via `execute_sql`. Expected: returns with no error (a `NOTICE` for T11 is fine only if every department currently has staff; today T11 should run, because `death` and `archives` are unstaffed). Run the leak check; expected `table_present` null and `leaked_triggers` 0.

If T12 errors with "cannot ALTER TABLE … because it has pending trigger events", move the T12 block to run first among the blocks that insert requests, and re-run.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261010121000_add_staff_notification_triggers.sql supabase/tests/staff_notification_triggers.test.sql
git commit -m "feat(notifications): fan out staff and admin notifications from triggers"
```

---

### Task 3: Fee-free requests settle through the cashier (server side)

**Files:**
- Modify: `src/features/requests/request-workflow.ts:90-98`
- Modify: `src/features/requests/requests.mutations.ts` (schema ~25-28, `advanceRequestStatusFn` ~49-54 and ~113-147, `verifyPaymentFn` ~179-247)
- Modify: `src/features/requests/pages/RequestDetailPage.tsx:114-119`

**Interfaces:**
- Produces: `isPaymentSettled(paymentStatus: string | null): boolean` (**signature change: one argument**); `verifyPaymentFn` input `{ requestId: string; orNumber?: string; confirmNoFee?: boolean }`.

- [ ] **Step 1: Record the TypeScript baseline**

```bash
cd /Users/joshuabulgado/civicheck
SCRATCH="${TMPDIR:-/tmp}"
pnpm exec tsc --noEmit 2>&1 | sort > "$SCRATCH/tsc-baseline.txt"; wc -l "$SCRATCH/tsc-baseline.txt"
```

Expected: a line count (0 if the project is clean). This file is the baseline every later task diffs against.

- [ ] **Step 2: Change `isPaymentSettled`**

In `src/features/requests/request-workflow.ts`, replace:

```ts
/**
 * A request can be released once the cashier has verified payment — or
 * straight away when no fee is due, since there's nothing for the cashier to
 * collect. Shared by the release button and the server-side release check.
 */
export function isPaymentSettled(feesDue: number, paymentStatus: string | null): boolean {
  return feesDue <= 0 || paymentStatus === "verified";
}
```

with:

```ts
/**
 * A request can be released only once the cashier has verified payment — or,
 * for a fee-free request, confirmed that no fee is due. Both leave
 * `payment_status` at "verified". Shared by the release button and the
 * server-side release check.
 */
export function isPaymentSettled(paymentStatus: string | null): boolean {
  return paymentStatus === "verified";
}
```

- [ ] **Step 3: Update the release check and drop auto-verify in `advanceRequestStatusFn`**

In `src/features/requests/requests.mutations.ts`, replace the select:

```ts
      .select(
        "id, status, payment_status, fees_due, tracking_number, services_registry(department_id)",
      )
```

with:

```ts
      .select(
        "id, status, payment_status, tracking_number, services_registry(department_id)",
      )
```

Replace:

```ts
    // The cashier verifies payment before the document leaves the counter —
    // unless no fee is due, in which case there's nothing to collect.
    const paymentSettled = isPaymentSettled(Number(request.fees_due ?? 0), request.payment_status);
```

with:

```ts
    // The cashier verifies payment — or confirms a fee-free request — before
    // the document leaves the counter.
    const paymentSettled = isPaymentSettled(request.payment_status);
```

Replace:

```ts
        status: toStatus,
        // A free request never visits the cashier, so settle it on release —
        // otherwise it would read "Unpaid" forever.
        ...(toStatus === "released" && request.payment_status !== "verified"
          ? { payment_status: "verified" }
          : {}),
        updated_at: new Date().toISOString(),
```

with:

```ts
        status: toStatus,
        updated_at: new Date().toISOString(),
```

- [ ] **Step 4: Allow fee-free confirmation in `verifyPaymentFn`**

Replace the schema:

```ts
const verifyPaymentSchema = z.object({
  requestId: z.string().uuid(),
  orNumber: z.string().optional(),
});
```

with:

```ts
const verifyPaymentSchema = z.object({
  requestId: z.string().uuid(),
  orNumber: z.string().optional(),
  /** Deliberate "no fee is due" tick; honoured only when the stored fee is zero. */
  confirmNoFee: z.boolean().optional(),
});
```

Replace this block:

```ts
    // Decided from the stored fee, never from the client. A free request has
    // nothing to verify — the admin can release it directly.
    if (Number(request.fees_due ?? 0) <= 0) {
      return {
        error: true,
        message: "No fee is due for this request, so there's no payment to verify.",
      };
    }
    const orNumber = data.orNumber?.trim() ?? "";
    if (!orNumber) {
      return { error: true, message: "Enter the official receipt number." };
    }

    const { data: updated, error } = await supabase
      .from("requests")
      .update({
        payment_status: "verified",
        or_number: orNumber,
        updated_at: new Date().toISOString(),
      })
```

with:

```ts
    // Decided from the stored fee, never from the client. A fee-free request
    // still passes through the cashier, who confirms it with a tick instead of
    // an official receipt number.
    const isFeeFree = Number(request.fees_due ?? 0) <= 0;
    let orNumber: string | null = null;
    if (isFeeFree) {
      if (data.confirmNoFee !== true) {
        return { error: true, message: "Confirm that no fee is due before clearing this request." };
      }
    } else {
      orNumber = data.orNumber?.trim() ?? "";
      if (!orNumber) {
        return { error: true, message: "Enter the official receipt number." };
      }
    }

    const { data: updated, error } = await supabase
      .from("requests")
      .update({
        payment_status: "verified",
        or_number: orNumber,
        updated_at: new Date().toISOString(),
      })
```

Replace the audit-log remarks:

```ts
      remarks: `Payment verified against OR ${orNumber}.`,
```

with:

```ts
      remarks: isFeeFree
        ? "Fee-free request confirmed by cashier — no payment due."
        : `Payment verified against OR ${orNumber}.`,
```

Also update the stale guard message in the same function from `"This request isn't ready for release yet — payment can only be verified once it's been approved for release."` to `"This request isn't ready for release yet — payment can only be verified once it has been marked ready for release."` (the word "approved" refers to a stage that no longer exists).

- [ ] **Step 5: Update the call site in `RequestDetailPage`**

In `src/features/requests/pages/RequestDetailPage.tsx`, replace:

```ts
  // Release waits on the cashier's payment check, unless no fee is due.
  const paymentSettled = isPaymentSettled(
    request.feesDue,
    request.paymentStatus,
  );
```

with:

```ts
  // Release waits on the cashier — a payment check, or a fee-free confirmation.
  const paymentSettled = isPaymentSettled(request.paymentStatus);
```

- [ ] **Step 6: Typecheck against the baseline**

```bash
pnpm exec tsc --noEmit 2>&1 | sort > "$SCRATCH/tsc-now.txt"; diff "$SCRATCH/tsc-baseline.txt" "$SCRATCH/tsc-now.txt" && echo NO_NEW_ERRORS
```

Expected: `NO_NEW_ERRORS`.

- [ ] **Step 7: Commit**

```bash
git add src/features/requests/request-workflow.ts src/features/requests/requests.mutations.ts src/features/requests/pages/RequestDetailPage.tsx
git commit -m "feat(payments): route fee-free requests through cashier confirmation"
```

---

### Task 4: Fee-free confirmation UI for the cashier

**Files:**
- Modify: `src/features/requests/components/PaymentVerificationPanel.tsx` (whole file)
- Modify: `src/features/requests/pages/RequestDetailPage.tsx:371-383`

**Interfaces:**
- Consumes: `verifyPaymentFn({ data: { requestId, orNumber?, confirmNoFee? } })` from Task 3.

- [ ] **Step 1: Replace the panel**

Overwrite `src/features/requests/components/PaymentVerificationPanel.tsx` with:

```tsx
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { usePermissions } from "~/hooks/usePermissions";
import { verifyPaymentFn } from "~/features/requests/requests.mutations";
import { getStatusDetails } from "~/features/requests/request-workflow";

export function PaymentVerificationPanel({
  requestId,
  status,
  feesDue,
  paymentStatus,
  orNumber,
  onVerified,
}: {
  requestId: string;
  status: string;
  feesDue: number;
  paymentStatus: string;
  orNumber: string | null;
  onVerified: () => void;
}) {
  const { can } = usePermissions();
  const canCollect = can("requests:collect_payment");
  const isReadyForRelease = status === "ready_for_release";

  const [value, setValue] = useState("");
  const [noFeeConfirmed, setNoFeeConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const isFree = feesDue <= 0;

  async function handleVerifyPayment() {
    setBusy(true);
    try {
      const res = await verifyPaymentFn({
        data: isFree
          ? { requestId, confirmNoFee: noFeeConfirmed }
          : { requestId, orNumber: value },
      });
      if (res.error) {
        toast.error(isFree ? "Could not confirm this request" : "Could not verify payment", {
          description: res.message,
        });
        return;
      }
      toast.success(isFree ? "Fee-free request confirmed" : "Payment verified");
      setValue("");
      setNoFeeConfirmed(false);
      onVerified();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-white p-6">
      <h2 className="mb-1 text-lg font-bold text-foreground">Payment</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Fee due: ₱{feesDue.toFixed(2)}
      </p>

      {paymentStatus === "verified" ? (
        isFree ? (
          <p className="text-sm text-foreground">
            No fee was due — this request is cleared for release.
          </p>
        ) : (
          <p className="text-sm text-foreground">
            Verified against OR{" "}
            <span className="font-bold">{orNumber ?? "—"}</span>.
          </p>
        )
      ) : !isReadyForRelease ? (
        <p className="text-sm italic text-muted-foreground">
          Payment can't be collected yet — this request is still{" "}
          {getStatusDetails(status).label.toLowerCase()}. It needs to be marked
          ready for release first.
        </p>
      ) : canCollect && isFree ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="no-fee-confirmed"
              checked={noFeeConfirmed}
              onCheckedChange={(checked) => setNoFeeConfirmed(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="no-fee-confirmed" className="leading-snug">
              Confirm that no fee is due for this request
            </Label>
          </div>
          <Button
            disabled={busy || !noFeeConfirmed}
            onClick={handleVerifyPayment}
          >
            Confirm fee-free request
          </Button>
        </div>
      ) : canCollect ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="or-number">Official receipt number</Label>
            <Input
              id="or-number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="000123"
            />
          </div>
          <Button
            disabled={busy || !value.trim()}
            onClick={handleVerifyPayment}
          >
            Verify payment
          </Button>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          {isFree
            ? "The cashier confirms fee-free requests before release."
            : "The cashier records payment against the official receipt."}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Fix the release-warning copy on the detail page**

In `src/features/requests/pages/RequestDetailPage.tsx`, replace:

```tsx
                    Only the CCRO admin can release the document once payment is
                    verified.
```

with:

```tsx
                    Only the CCRO admin can release the document once the cashier
                    has cleared it.
```

and replace:

```tsx
                    Payment must be verified before this can be released.
```

with:

```tsx
                    The cashier must clear this request (payment verified, or
                    fee-free confirmed) before it can be released.
```

- [ ] **Step 3: Typecheck against the baseline**

```bash
pnpm exec tsc --noEmit 2>&1 | sort > "$SCRATCH/tsc-now.txt"; diff "$SCRATCH/tsc-baseline.txt" "$SCRATCH/tsc-now.txt" && echo NO_NEW_ERRORS
```

Expected: `NO_NEW_ERRORS`.

- [ ] **Step 4: Commit**

```bash
git add src/features/requests/components/PaymentVerificationPanel.tsx src/features/requests/pages/RequestDetailPage.tsx
git commit -m "feat(payments): let the cashier confirm fee-free requests with a checkbox"
```

---

### Task 5: Permission and audience helper

**Files:**
- Modify: `src/lib/permissions.ts`
- Create: `src/features/notifications/notification-audience.ts`
- Modify: `docs/RBAC.md`

**Interfaces:**
- Produces: `Permission` includes `"notifications:view_staff"`; `getNotificationAudience(role: Role): "applicant" | "staff" | null`; `type NotificationAudience = "applicant" | "staff"`.

- [ ] **Step 1: Add the permission type**

In `src/lib/permissions.ts` replace:

```ts
  | "requests:encode_walkin"

  // CCRO personnel administration
```

with:

```ts
  | "requests:encode_walkin"

  // notifications
  | "notifications:view_staff"

  // CCRO personnel administration
```

- [ ] **Step 2: Grant it to the four operational roles**

Replace (staff):

```ts
    "requests:process",
    "requests:encode_walkin",
    "dashboard:staff",
  ],
  supervisor: [
```

with:

```ts
    "requests:process",
    "requests:encode_walkin",
    "notifications:view_staff",
    "dashboard:staff",
  ],
  supervisor: [
```

Replace (supervisor and cashier):

```ts
    "requests:reverse_verification",
    "requests:encode_walkin",
    "dashboard:staff",
  ],
  cashier: ["requests:collect_payment", "requests:view_payments", "dashboard:staff"],
```

with:

```ts
    "requests:reverse_verification",
    "requests:encode_walkin",
    "notifications:view_staff",
    "dashboard:staff",
  ],
  cashier: [
    "requests:collect_payment",
    "requests:view_payments",
    "notifications:view_staff",
    "dashboard:staff",
  ],
```

Replace (admin):

```ts
    "requests:view_payments",
    "users:invite_staff",
```

with:

```ts
    "requests:view_payments",
    "notifications:view_staff",
    "users:invite_staff",
```

- [ ] **Step 3: Create the audience helper**

Create `src/features/notifications/notification-audience.ts`:

```ts
import { hasPermission, type Role } from "~/lib/permissions";

/**
 * Which notification feed a role reads. Applicants read the request-scoped
 * `notifications` table (with its email outbox); CCRO personnel read their own
 * `staff_notifications` rows. `system_admin` has neither, so it gets `null`.
 */
export type NotificationAudience = "applicant" | "staff";

export function getNotificationAudience(role: Role): NotificationAudience | null {
  if (hasPermission(role, "requests:view_own")) return "applicant";
  if (hasPermission(role, "notifications:view_staff")) return "staff";
  return null;
}
```

- [ ] **Step 4: Document the permission**

In `docs/RBAC.md` replace:

```md
| `requests:encode_walkin` | staff, supervisor, admin | Encode an accountless request for a walk-in visitor, for a service owned by the caller's department |
```

with:

```md
| `requests:encode_walkin` | staff, supervisor, admin | Encode an accountless request for a walk-in visitor, for a service owned by the caller's department |

## Notification permissions

| Permission | Assigned to | Purpose |
|---|---|---|
| `notifications:view_staff` | staff, supervisor, cashier, admin | Read and manage the caller's own in-system notification feed. Rows are written by database triggers and are scoped to the recipient by RLS; staff and supervisors only receive events for their own department. Not granted to `applicant` (own feed uses `requests:view_own`) or `system_admin` |
```

- [ ] **Step 5: Typecheck against the baseline**

```bash
pnpm exec tsc --noEmit 2>&1 | sort > "$SCRATCH/tsc-now.txt"; diff "$SCRATCH/tsc-baseline.txt" "$SCRATCH/tsc-now.txt" && echo NO_NEW_ERRORS
```

Expected: `NO_NEW_ERRORS`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/permissions.ts src/features/notifications/notification-audience.ts docs/RBAC.md
git commit -m "feat(notifications): add notifications:view_staff permission and audience helper"
```

---

### Task 6: Role-dispatching notification server functions

**Files:**
- Rewrite: `src/features/notifications/notifications.queries.ts`
- Rewrite: `src/features/notifications/notifications.mutations.ts`

**Interfaces:**
- Consumes: `getNotificationAudience` (Task 5); table `staff_notifications` (Task 1).
- Produces: `NotificationType` widened with `new_request | document_resubmitted | awaiting_cashier | ready_to_release | request_incomplete | request_rejected`; `NotificationTarget = { to: "/my-requests/$requestId"; requestId: string } | { to: "/requests/$requestId"; requestId: string } | { to: "/cashier"; tracking: string }`; `NotificationRow` gains `target: NotificationTarget`. `getMyNotificationsFn`, `getUnreadNotificationCountFn`, `updateNotificationFn`, `markAllNotificationsReadFn` keep their names and call shapes.

- [ ] **Step 1: Rewrite the queries module**

Overwrite `src/features/notifications/notifications.queries.ts` with:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
import { hasPermission, type Role } from "~/lib/permissions";
import { getNotificationAudience } from "~/features/notifications/notification-audience";

export type NotificationType =
  // applicant feed
  | "status_change"
  | "pre_validation_complete"
  | "document_rejected"
  // CCRO personnel feed
  | "new_request"
  | "document_resubmitted"
  | "awaiting_cashier"
  | "ready_to_release"
  | "request_incomplete"
  | "request_rejected";

/**
 * Where opening a notification leads. The cashier has no access to the request
 * detail page, so its notifications land on the counter with the tracking
 * number pre-filled.
 */
export type NotificationTarget =
  | { to: "/my-requests/$requestId"; requestId: string }
  | { to: "/requests/$requestId"; requestId: string }
  | { to: "/cashier"; tracking: string };

export const NOTIFICATIONS_PAGE_SIZE = 30;
const NOTIFICATIONS_MAX = 300;

export interface NotificationRow {
  id: string;
  requestId: string;
  type: NotificationType;
  archivedAt: string | null;
  subject: string;
  body: string;
  status: string;
  isRead: boolean;
  sentAt: string;
  trackingNumber: string;
  target: NotificationTarget;
}

function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

/**
 * Rows written before the feed/email copy was split still end with the
 * email-only "Sign in to CiviCheck and …" lead-in, which is wrong for someone
 * reading the feed while signed in. Drop the lead-in and re-capitalize.
 */
function toFeedBody(body: string) {
  return body.replace(
    /Sign in to CiviCheck and (\w)/,
    (_match, first: string) => first.toUpperCase(),
  );
}

export interface NotificationsPage {
  items: NotificationRow[];
  hasMore: boolean;
}

async function readApplicantFeed(
  supabase: SupabaseClient,
  userId: string,
  limit: number,
): Promise<NotificationsPage> {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, request_id, type, archived_at, subject, body, status, is_read, sent_at, requests!inner(tracking_number, applicant_id)",
    )
    .eq("requests.applicant_id", userId)
    .order("sent_at", { ascending: false })
    // One extra row tells us whether there is another page without a count query.
    .limit(limit + 1);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const items: NotificationRow[] = rows.slice(0, limit).map((row: any) => ({
    id: row.id,
    requestId: row.request_id,
    type: row.type,
    archivedAt: row.archived_at,
    subject: row.subject,
    body: toFeedBody(row.body),
    status: row.status,
    isRead: row.is_read,
    sentAt: row.sent_at,
    trackingNumber: one<{ tracking_number: string }>(row.requests)?.tracking_number ?? "",
    target: { to: "/my-requests/$requestId", requestId: row.request_id },
  }));

  return { items, hasMore: rows.length > limit };
}

async function readStaffFeed(
  supabase: SupabaseClient,
  userId: string,
  role: Role,
  limit: number,
): Promise<NotificationsPage> {
  const { data, error } = await supabase
    .from("staff_notifications")
    .select(
      "id, request_id, tracking_number, type, title, body, is_read, archived_at, created_at",
    )
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (error) throw new Error(error.message);

  const canOpenRequest = hasPermission(role, "requests:view_all");
  const rows = data ?? [];
  const items: NotificationRow[] = rows.slice(0, limit).map((row: any) => ({
    id: row.id,
    requestId: row.request_id,
    type: row.type,
    archivedAt: row.archived_at,
    subject: row.title,
    body: row.body,
    status: "sent",
    isRead: row.is_read,
    sentAt: row.created_at,
    trackingNumber: row.tracking_number,
    target: canOpenRequest
      ? { to: "/requests/$requestId", requestId: row.request_id }
      : { to: "/cashier", tracking: row.tracking_number },
  }));

  return { items, hasMore: rows.length > limit };
}

export const getMyNotificationsFn = createServerFn({ method: "GET" })
  .validator((d: { limit?: number } | undefined) => d)
  .handler(async ({ data: input }): Promise<NotificationsPage> => {
    const { supabase, user, role } = await requireActiveSession();
    const audience = getNotificationAudience(role);
    if (!audience) throw new Error("Forbidden: this role has no notification feed");

    const limit = Math.min(
      Math.max(Math.trunc(input?.limit ?? NOTIFICATIONS_PAGE_SIZE), 1),
      NOTIFICATIONS_MAX,
    );

    return audience === "applicant"
      ? readApplicantFeed(supabase, user.id, limit)
      : readStaffFeed(supabase, user.id, role, limit);
  });

export const getUnreadNotificationCountFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const { supabase, user, role } = await requireActiveSession();
    const audience = getNotificationAudience(role);
    if (!audience) return 0;

    if (audience === "staff") {
      const { count, error } = await supabase
        .from("staff_notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      if (error) throw new Error(error.message);
      return count ?? 0;
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id, requests!inner(applicant_id)", { count: "exact", head: true })
      .eq("requests.applicant_id", user.id)
      .eq("is_read", false);

    if (error) throw new Error(error.message);
    return count ?? 0;
  },
);
```

- [ ] **Step 2: Rewrite the mutations module**

Overwrite `src/features/notifications/notifications.mutations.ts` with:

```ts
import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
import { getNotificationAudience } from "~/features/notifications/notification-audience";

export type NotificationAction = "read" | "unread" | "archive" | "unarchive";

/** The columns each action writes. Archiving also marks the row read so it never lingers in the unread badge. */
function patchFor(action: NotificationAction) {
  const now = new Date().toISOString();
  switch (action) {
    case "read":
      return { is_read: true, read_at: now };
    case "unread":
      return { is_read: false, read_at: null };
    case "archive":
      return { is_read: true, read_at: now, archived_at: now };
    case "unarchive":
      return { archived_at: null };
  }
}

export const updateNotificationFn = createServerFn({ method: "POST" })
  .validator((d: { notificationId: string; action: NotificationAction }) => d)
  .handler(async ({ data }) => {
    const { supabase, user, role } = await requireActiveSession();
    const audience = getNotificationAudience(role);
    if (!audience) return { error: true, message: "Notification not found." };

    if (audience === "staff") {
      const { data: row } = await supabase
        .from("staff_notifications")
        .select("id")
        .eq("id", data.notificationId)
        .eq("recipient_id", user.id)
        .maybeSingle();
      if (!row) return { error: true, message: "Notification not found." };

      const { error } = await supabase
        .from("staff_notifications")
        .update(patchFor(data.action))
        .eq("id", data.notificationId)
        .eq("recipient_id", user.id);
      if (error) return { error: true, message: error.message };

      return { error: false };
    }

    const { data: row } = await supabase
      .from("notifications")
      .select("id, requests!inner(applicant_id)")
      .eq("id", data.notificationId)
      .eq("requests.applicant_id", user.id)
      .maybeSingle();
    if (!row) return { error: true, message: "Notification not found." };

    const { error } = await supabase
      .from("notifications")
      .update(patchFor(data.action))
      .eq("id", data.notificationId);
    if (error) return { error: true, message: error.message };

    return { error: false };
  });

export const markAllNotificationsReadFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabase, user, role } = await requireActiveSession();
    const audience = getNotificationAudience(role);
    if (!audience) return { error: false };

    if (audience === "staff") {
      const { error } = await supabase
        .from("staff_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .eq("is_read", false);
      if (error) return { error: true, message: error.message };

      return { error: false };
    }

    // PostgREST only accepts a WHERE on the target table's own columns for
    // UPDATE, so the applicant-ownership join has to be resolved as a
    // separate SELECT first — matches getMyNotificationsFn's filter shape.
    const { data: unread, error: fetchError } = await supabase
      .from("notifications")
      .select("id, requests!inner(applicant_id)")
      .eq("requests.applicant_id", user.id)
      .eq("is_read", false);
    if (fetchError) return { error: true, message: fetchError.message };

    const ids = (unread ?? []).map((row) => row.id);
    if (ids.length === 0) return { error: false };

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", ids);
    if (error) return { error: true, message: error.message };

    return { error: false };
  },
);
```

- [ ] **Step 3: Typecheck**

```bash
pnpm exec tsc --noEmit 2>&1 | sort > "$SCRATCH/tsc-now.txt"; diff "$SCRATCH/tsc-baseline.txt" "$SCRATCH/tsc-now.txt"
```

Expected: the only new errors are in `NotificationsPage.tsx` / `notifications.tsx` (missing `target` use or the `TYPE_STYLE` record not covering the widened `NotificationType`). Those are fixed in Task 7. Any error in the two files edited here is a bug — fix it before moving on.

- [ ] **Step 4: Commit**

```bash
git add src/features/notifications/notifications.queries.ts src/features/notifications/notifications.mutations.ts
git commit -m "feat(notifications): dispatch notification server functions by role"
```

---

### Task 7: Feed page, route and cashier deep link

**Files:**
- Modify: `src/features/notifications/pages/NotificationsPage.tsx`
- Rewrite: `src/routes/_authed/_dashboard/notifications.tsx`
- Modify: `src/routes/_authed/_dashboard/cashier.tsx`
- Modify: `src/features/cashier/components/CashierCounter.tsx`

**Interfaces:**
- Consumes: `NotificationRow.target`, widened `NotificationType` (Task 6); `getNotificationAudience`, `NotificationAudience` (Task 5).
- Produces: `NotificationsPage` prop `audience: NotificationAudience`; `/cashier` accepts `?tracking=<tracking number>`; `CashierCounter` prop `initialTracking?: string`.

- [ ] **Step 1: Imports and type icons**

In `src/features/notifications/pages/NotificationsPage.tsx` replace:

```tsx
import {
  Archive,
  ArchiveRestore,
  Bell,
  Check,
  CircleCheckBig,
  FileWarning,
  MailWarning,
  MoreHorizontal,
  RefreshCw,
  Undo2,
  type LucideIcon,
} from "lucide-react";
```

with:

```tsx
import {
  Archive,
  ArchiveRestore,
  Banknote,
  Bell,
  Check,
  CircleCheckBig,
  CircleX,
  FilePlus2,
  FileUp,
  FileWarning,
  MailWarning,
  MoreHorizontal,
  RefreshCw,
  Undo2,
  type LucideIcon,
} from "lucide-react";
```

Replace:

```tsx
import type {
  NotificationRow,
  NotificationType,
} from "~/features/notifications/notifications.queries";
```

with:

```tsx
import type {
  NotificationRow,
  NotificationTarget,
  NotificationType,
} from "~/features/notifications/notifications.queries";
import type { NotificationAudience } from "~/features/notifications/notification-audience";
import { usePermissions } from "~/hooks/usePermissions";
```

Replace the `TYPE_STYLE` constant:

```tsx
const TYPE_STYLE: Record<NotificationType, { icon: LucideIcon; unreadClass: string }> = {
  status_change: { icon: RefreshCw, unreadClass: "bg-primary text-white" },
  pre_validation_complete: { icon: CircleCheckBig, unreadClass: "bg-primary text-white" },
  document_rejected: { icon: FileWarning, unreadClass: "bg-destructive text-white" },
};
```

with:

```tsx
const TYPE_STYLE: Record<NotificationType, { icon: LucideIcon; unreadClass: string }> = {
  status_change: { icon: RefreshCw, unreadClass: "bg-primary text-white" },
  pre_validation_complete: { icon: CircleCheckBig, unreadClass: "bg-primary text-white" },
  document_rejected: { icon: FileWarning, unreadClass: "bg-destructive text-white" },
  new_request: { icon: FilePlus2, unreadClass: "bg-primary text-white" },
  document_resubmitted: { icon: FileUp, unreadClass: "bg-primary text-white" },
  awaiting_cashier: { icon: Banknote, unreadClass: "bg-primary text-white" },
  ready_to_release: { icon: CircleCheckBig, unreadClass: "bg-primary text-white" },
  request_incomplete: { icon: FileWarning, unreadClass: "bg-destructive text-white" },
  request_rejected: { icon: CircleX, unreadClass: "bg-destructive text-white" },
};

/** One typed `Link` per destination, so each keeps its own params/search checking. */
function linkFor(target: NotificationTarget, onClick: () => void) {
  switch (target.to) {
    case "/requests/$requestId":
      return (
        <Link to="/requests/$requestId" params={{ requestId: target.requestId }} onClick={onClick} />
      );
    case "/cashier":
      return <Link to="/cashier" search={{ tracking: target.tracking }} onClick={onClick} />;
    default:
      return (
        <Link
          to="/my-requests/$requestId"
          params={{ requestId: target.requestId }}
          onClick={onClick}
        />
      );
  }
}
```

- [ ] **Step 2: Use the per-row target**

Replace:

```tsx
      <Item
        render={
          <Link
            to="/my-requests/$requestId"
            params={{ requestId: notification.requestId }}
            onClick={() => onOpen(notification)}
          />
        }
```

with:

```tsx
      <Item
        render={linkFor(notification.target, () => onOpen(notification))}
```

- [ ] **Step 3: Audience prop and copy**

Replace:

```tsx
interface NotificationsPageProps {
  notifications: NotificationRow[];
```

with:

```tsx
interface NotificationsPageProps {
  /** Which feed this is: applicants get email-backed updates, CCRO staff in-system alerts. */
  audience: NotificationAudience;
  notifications: NotificationRow[];
```

Replace:

```tsx
export default function NotificationsPage({
  notifications,
  hasMore,
  onLoadMore,
  onUpdated,
}: NotificationsPageProps) {
  const [filter, setFilter] = useState<Filter>("all");
```

with:

```tsx
export default function NotificationsPage({
  audience,
  notifications,
  hasMore,
  onLoadMore,
  onUpdated,
}: NotificationsPageProps) {
  const isApplicant = audience === "applicant";
  const { can } = usePermissions();
  const [filter, setFilter] = useState<Filter>("all");
```

Replace:

```tsx
              Applicant workspace
            </p>
```

with:

```tsx
              {isApplicant ? "Applicant workspace" : "CCRO workspace"}
            </p>
```

Replace:

```tsx
              {unreadCount > 0
                ? `You have ${unreadCount} unread ${unreadCount === 1 ? "update" : "updates"} on your requests. We also email you each one.`
                : "You're all caught up. We'll post here, and email you, whenever a request changes."}
```

with:

```tsx
              {isApplicant
                ? unreadCount > 0
                  ? `You have ${unreadCount} unread ${unreadCount === 1 ? "update" : "updates"} on your requests. We also email you each one.`
                  : "You're all caught up. We'll post here, and email you, whenever a request changes."
                : unreadCount > 0
                  ? `You have ${unreadCount} unread ${unreadCount === 1 ? "alert" : "alerts"} that need your attention.`
                  : "You're all caught up. Requests that need your action will show up here."}
```

Replace the empty-state description and button:

```tsx
            <EmptyDescription>
              Once you submit a request, we'll post an update here whenever staff review your
              documents or move it to the next step.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              to="/my-requests"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Go to my requests
            </Link>
          </EmptyContent>
```

with:

```tsx
            <EmptyDescription>
              {isApplicant
                ? "Once you submit a request, we'll post an update here whenever staff review your documents or move it to the next step."
                : "When a request needs your action, it will be posted here."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {isApplicant ? (
              <Link
                to="/my-requests"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Go to my requests
              </Link>
            ) : can("requests:view_all") ? (
              <Link
                to="/requests"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Open the request queue
              </Link>
            ) : (
              <Link
                to="/cashier"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Open the cashier counter
              </Link>
            )}
          </EmptyContent>
```

Also replace the failure-copy constant so staff don't read "your" text that is applicant-specific only where it appears in a toast — leave `UPDATE_FAILED` as is (it is generic enough).

- [ ] **Step 4: Rewrite the notifications route**

Overwrite `src/routes/_authed/_dashboard/notifications.tsx` with:

```tsx
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import type { Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import {
  getMyNotificationsFn,
  NOTIFICATIONS_PAGE_SIZE,
} from "~/features/notifications/notifications.queries";
import { getNotificationAudience } from "~/features/notifications/notification-audience";
import NotificationsPage from "~/features/notifications/pages/NotificationsPage";
import { denyAccess } from "~/lib/access";

export const Route = createFileRoute("/_authed/_dashboard/notifications")({
  beforeLoad: ({ context, location }) => {
    if (!context.user || !getNotificationAudience(context.user.role as Role))
      denyAccess(location);
  },
  // "Load more" raises `limit` in the URL rather than appending to local state,
  // so realtime refreshes and back/forward navigation stay consistent.
  validateSearch: (search: Record<string, unknown>): { limit?: number } => {
    const limit = Number(search.limit);
    return Number.isFinite(limit) && limit > NOTIFICATIONS_PAGE_SIZE ? { limit } : {};
  },
  loaderDeps: ({ search }) => ({ limit: search.limit ?? NOTIFICATIONS_PAGE_SIZE }),
  loader: ({ deps }) => getMyNotificationsFn({ data: { limit: deps.limit } }),
  staleTime: 30_000,
  component: NotificationsRoute,
});

function NotificationsRoute() {
  const { items, hasMore } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const { limit = NOTIFICATIONS_PAGE_SIZE } = Route.useSearch();
  const router = useRouter();
  const navigate = useNavigate({ from: Route.fullPath });
  // beforeLoad has already denied roles without a feed.
  const audience = getNotificationAudience(user!.role as Role) ?? "applicant";
  useRealtimeRefresh({
    tables: [audience === "staff" ? "staff_notifications" : "notifications"],
  });

  return (
    <NotificationsPage
      audience={audience}
      notifications={items}
      hasMore={hasMore}
      onLoadMore={() =>
        navigate({
          search: { limit: limit + NOTIFICATIONS_PAGE_SIZE },
          resetScroll: false,
        })
      }
      onUpdated={() => router.invalidate()}
    />
  );
}
```

- [ ] **Step 5: `tracking` search param on `/cashier`**

In `src/routes/_authed/_dashboard/cashier.tsx` replace:

```tsx
  component: CashierPage,
});

function CashierPage() {
  return (
```

with:

```tsx
  // A notification links here with the request's tracking number pre-filled.
  validateSearch: (search: Record<string, unknown>): { tracking?: string } => {
    const tracking = typeof search.tracking === "string" ? search.tracking.trim() : "";
    return tracking ? { tracking } : {};
  },
  component: CashierPage,
});

function CashierPage() {
  const { tracking } = Route.useSearch();
  return (
```

and replace:

```tsx
        <CashierCounter />
```

with:

```tsx
        <CashierCounter initialTracking={tracking} />
```

- [ ] **Step 6: Auto-lookup in `CashierCounter`**

In `src/features/cashier/components/CashierCounter.tsx` replace:

```tsx
import { useState } from "react";
```

with:

```tsx
import { useEffect, useState } from "react";
```

Replace:

```tsx
export function CashierCounter() {
  const [trackingNumber, setTrackingNumber] = useState("");
```

with:

```tsx
export function CashierCounter({ initialTracking }: { initialTracking?: string }) {
  const [trackingNumber, setTrackingNumber] = useState(initialTracking ?? "");
```

Immediately after the `handleScanned` function (the one ending `handleLookup(value);\n  }`), add:

```tsx
  // Arriving from a notification: look the request up straight away.
  useEffect(() => {
    if (initialTracking) {
      setTrackingNumber(initialTracking);
      void handleLookup(initialTracking);
    }
    // handleLookup only closes over state setters; re-run when the param changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTracking]);
```

- [ ] **Step 7: Typecheck against the baseline**

```bash
pnpm exec tsc --noEmit 2>&1 | sort > "$SCRATCH/tsc-now.txt"; diff "$SCRATCH/tsc-baseline.txt" "$SCRATCH/tsc-now.txt" && echo NO_NEW_ERRORS
```

Expected: `NO_NEW_ERRORS`. If `lucide-react` lacks one of `Banknote`, `CircleX`, `FilePlus2`, `FileUp`, pick the nearest existing icon from the same package and update `TYPE_STYLE` and the import together.

- [ ] **Step 8: Commit**

```bash
git add src/features/notifications/pages/NotificationsPage.tsx src/routes/_authed/_dashboard/notifications.tsx src/routes/_authed/_dashboard/cashier.tsx src/features/cashier/components/CashierCounter.tsx
git commit -m "feat(notifications): show staff and admin feed with request deep links"
```

---

### Task 8: Sidebar item, unread badge and realtime for staff roles

**Files:**
- Modify: `src/routes/_authed/_dashboard/route.tsx`
- Modify: `src/components/sidebar-01/app-sidebar.tsx`

**Interfaces:**
- Consumes: `getNotificationAudience` (Task 5); role-dispatching `getUnreadNotificationCountFn` (Task 6).

- [ ] **Step 1: Count and subscribe by audience**

In `src/routes/_authed/_dashboard/route.tsx` replace:

```tsx
import { getUnreadNotificationCountFn } from "~/features/notifications/notifications.queries";
```

with:

```tsx
import { getUnreadNotificationCountFn } from "~/features/notifications/notifications.queries";
import { getNotificationAudience } from "~/features/notifications/notification-audience";
```

Replace:

```tsx
  loader: async ({ context }) => ({
    unreadNotifications:
      context.user?.role === "applicant" ? await getUnreadNotificationCountFn() : 0,
  }),
```

with:

```tsx
  loader: async ({ context }) => ({
    unreadNotifications:
      context.user && getNotificationAudience(context.user.role as Role)
        ? await getUnreadNotificationCountFn()
        : 0,
  }),
```

Replace:

```tsx
  // Sidebar badge tracks new notifications live, from wherever the applicant
  // happens to be — not just while they're on the notifications page itself.
  useRealtimeRefresh({ tables: ["notifications"], enabled: user?.role === "applicant" });
```

with:

```tsx
  // Sidebar badge tracks new notifications live, from wherever the reader
  // happens to be — not just while they're on the notifications page itself.
  const audience = user ? getNotificationAudience(user.role as Role) : null;
  useRealtimeRefresh({
    tables: [audience === "staff" ? "staff_notifications" : "notifications"],
    enabled: audience !== null,
  });
```

- [ ] **Step 2: One notifications item, shown to both audiences**

In `src/components/sidebar-01/app-sidebar.tsx`, immediately above the line `// Build navMain dynamically based on permissions`, add:

```tsx
  const notificationsItem: NavItem = {
    id: "notifications",
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    badge: unreadNotifications,
  };

```

Replace:

```tsx
    navMain.push({
      id: "my-requests",
      title: "My Requests",
      url: "/my-requests",
      icon: ClipboardCheck,
    });
    navMain.push({
      id: "notifications",
      title: "Notifications",
      url: "/notifications",
      icon: Bell,
      badge: unreadNotifications,
    });
  }
```

with:

```tsx
    navMain.push({
      id: "my-requests",
      title: "My Requests",
      url: "/my-requests",
      icon: ClipboardCheck,
    });
    navMain.push(notificationsItem);
  }

  // Personnel read their own in-system feed; applicants get theirs above.
  if (!can("requests:view_own") && can("notifications:view_staff")) {
    navMain.push(notificationsItem);
  }
```

- [ ] **Step 3: Keep the item from being dropped for admin**

Admin's sidebar is built from an explicit id list, so an unlisted item vanishes. Replace:

```tsx
    { id: "operations", label: "Operations", itemIds: ["request-queue"] },
```

with:

```tsx
    {
      id: "operations",
      label: "Operations",
      itemIds: ["request-queue", "notifications"],
    },
```

- [ ] **Step 4: Typecheck against the baseline**

```bash
pnpm exec tsc --noEmit 2>&1 | sort > "$SCRATCH/tsc-now.txt"; diff "$SCRATCH/tsc-baseline.txt" "$SCRATCH/tsc-now.txt" && echo NO_NEW_ERRORS
```

Expected: `NO_NEW_ERRORS`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/_authed/_dashboard/route.tsx src/components/sidebar-01/app-sidebar.tsx
git commit -m "feat(notifications): add notifications nav item and live badge for staff roles"
```

---

### Task 9: Apply the migrations and verify end to end (needs user approval)

**Files:** none created; applies `supabase/migrations/20261010120000_add_staff_notifications.sql` and `supabase/migrations/20261010121000_add_staff_notification_triggers.sql`.

- [ ] **Step 1: Get explicit approval for the target**

Stop and ask the user, with the facts: the app code from Tasks 3–8 reads `staff_notifications` and will error for staff roles until the migrations exist; the migrations create a table and four triggers and change nothing existing. Offer: (a) apply to the live `CiviCheck` project, or (b) create a Supabase branch first (billed; needs the user's cost confirmation via `get_cost` / `confirm_cost`). Do not proceed without a clear choice.

- [ ] **Step 2: Apply**

With approval, call `mcp__plugin_supabase_supabase__apply_migration` once per file, in order, with `name` `add_staff_notifications` then `add_staff_notification_triggers` and `query` set to each file's contents. Then run:

```sql
select
  to_regclass('public.staff_notifications') is not null as table_present,
  (select count(*) from pg_trigger where tgname in
    ('notify_request_submitted','notify_request_status_changed',
     'notify_request_payment_verified','notify_document_resubmitted')) as triggers;
```

Expected: `table_present` true and `triggers` 4.

- [ ] **Step 3: Security advisors**

Call `mcp__plugin_supabase_supabase__get_advisors` with type `security`. Expected: no new finding mentioning `staff_notifications`, `notify_internal_recipients` or the `trg_notify_*` functions. Resolve or report any that appear.

- [ ] **Step 4: Playwright pass per role**

Start `pnpm dev`. Ask the user to sign in as each role in the Playwright browser (or supply test accounts); do not create accounts. For each role, record what you saw:

| Role | Check |
|---|---|
| applicant | `/notifications` shows the unchanged applicant feed; badge counts as before; rows open `/my-requests/<id>` |
| staff / supervisor (department with staff) | Submit a request as an applicant for one of their department's services → a `New request` row appears live and the badge increments; opening it lands on `/requests/<id>`; another department's staff sees nothing |
| applicant → staff | Resubmit a rejected document → staff gets `document resubmitted` |
| cashier | Mark a request ready for release → `Ready for payment verification` (or `fee-free confirmation`); clicking opens `/cashier?tracking=…` and the lookup runs by itself; for a fee-free request the panel shows the checkbox and **no** OR field; confirming clears it |
| admin | Cashier confirms → `Payment verified` / `Fee-free request confirmed` row; Notifications item is present in the sidebar; Release is blocked before the cashier confirms a fee-free request |
| system_admin | No Notifications item; `/notifications` redirects to forbidden |

- [ ] **Step 5: Report**

Summarize what passed and what did not, including that requests for `death` and `archives` services notify nobody (no staff assigned today). Do not claim a check passed that was not observed.

---

## Self-review

**Spec coverage**

| Spec section | Task |
|---|---|
| §4 data model, RLS, grants, realtime, `tracking_number` | 1 |
| §5 triggers, recipient rules, transitions-only, actor exclusion, never-block, unstaffed dept | 2 (tests T1–T14) |
| §6 fee-free: `isPaymentSettled`, `verifyPaymentFn`, auto-verify removal, panel, history | 3, 4 (Payment History needs no change: it already null-guards `orNumber`) |
| §7 permission, server function dispatch, view model, route, shell, sidebar, cashier deep link | 5, 6, 7, 8 |
| §8 UI reuse, icons, copy | 7 |
| §9 testing | SQL runner in 1, 2, 9; `tsc` in 3–8; Playwright in 9 |
| §10 rollout via branch / approval | 9 |

**Placeholder scan:** no TBD/TODO; every code step shows the code.

**Type consistency:** `isPaymentSettled(paymentStatus)` is one-argument in Tasks 3 and 4; `NotificationTarget` and `NotificationRow.target` are defined in Task 6 and consumed with the same three `to` values in Task 7; `getNotificationAudience` / `NotificationAudience` are defined in Task 5 and used by name in Tasks 6–8; `staff_notifications` column names (`recipient_id`, `tracking_number`, `title`, `is_read`, `read_at`, `archived_at`, `created_at`) match between the migration, the triggers and the queries.

**Known open item for the owner (not built):** `death` and `archives` services have no staff, so `new_request` goes nowhere for them; an admin fallback is not part of this plan.
