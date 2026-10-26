import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Runs the security-hardening and rate-limit migrations against an in-process
// Postgres (PGlite), on top of the tables, helpers and policies as they stood in
// the live project before them (copied from its catalog). Each test then signs
// in as a role and tries what a user could send straight through PostgREST.

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const read = (file: string) =>
  readFileSync(
    fileURLToPath(new URL(`../../supabase/migrations/${file}`, import.meta.url)),
    "utf8",
  );
const HARDENING = read("20261027120000_security_hardening.sql");
const RATE_LIMITS = read("20261027121000_add_rate_limits.sql");
const PROFILE_SCOPE = read("20261027122000_scope_personnel_profile_reads.sql");

const APPLICANT = "a0000000-0000-0000-0000-000000000001";
const OTHER_APPLICANT = "a0000000-0000-0000-0000-000000000002";
const STAFF_A = "b0000000-0000-0000-0000-000000000001";
const STAFF_B = "b0000000-0000-0000-0000-000000000002";
const SUPERVISOR_A = "b0000000-0000-0000-0000-000000000003";
const CASHIER = "c0000000-0000-0000-0000-000000000001";
const ADMIN = "d0000000-0000-0000-0000-000000000001";
const SUSPENDED_STAFF = "b0000000-0000-0000-0000-000000000009";
const CITIZEN_WITHOUT_REQUESTS = "a0000000-0000-0000-0000-000000000003";

const REQUEST_A = "e0000000-0000-0000-0000-000000000001";
const REQUEST_B = "e0000000-0000-0000-0000-000000000002";
const ATTACHMENT_A = "f0000000-0000-0000-0000-000000000001";
const ATTACHMENT_B = "f0000000-0000-0000-0000-000000000002";

const FILE_A = `${APPLICANT}/drafts/x/birth.pdf`;
const FILE_B = `${OTHER_APPLICANT}/drafts/y/marriage.pdf`;

// The live schema and policies these migrations change, as they were.
const BEFORE = `
  create role anon; create role authenticated; create role service_role bypassrls;
  grant usage on schema public to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create function auth.role() returns text language sql stable as $$
    select nullif(current_setting('request.jwt.claim.role', true), '')
  $$;

  create schema storage;
  grant usage on schema storage to anon, authenticated, service_role;
  create table storage.buckets (
    id text primary key, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text, name text
  );
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
  alter table storage.objects enable row level security;
  grant all on storage.objects to anon, authenticated, service_role;
  insert into storage.buckets (id) values ('request-documents');

  create table public.departments (
    id text primary key, name text not null, is_active boolean not null default true
  );
  create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    first_name varchar not null, last_name varchar not null,
    role varchar not null default 'applicant',
    employment_type text, department_id text references public.departments(id),
    access_status text not null default 'active',
    suspended_at timestamptz, suspended_by uuid, suspension_reason text,
    sessions_revoked_at timestamptz, updated_at timestamptz not null default now()
  );
  create table public.services_registry (
    service_code varchar primary key,
    department_id text references public.departments(id)
  );
  create table public.service_requirements_metadata (id uuid primary key);
  create table public.requests (
    id uuid primary key default gen_random_uuid(),
    tracking_number varchar not null unique,
    applicant_id uuid references public.profiles(id),
    request_type varchar not null references public.services_registry(service_code),
    status varchar not null default 'submitted',
    form_data jsonb not null default '{}'::jsonb,
    or_number varchar unique,
    fees_due numeric not null default 0,
    payment_status varchar not null default 'unpaid',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    form_template_version_id uuid,
    copies integer not null default 1
  );
  create table public.requirements_attachments (
    id uuid primary key default gen_random_uuid(),
    request_id uuid not null references public.requests(id) on delete cascade,
    requirement_name varchar not null,
    file_url varchar not null,
    verification_status varchar not null default 'pending',
    rejection_reason text,
    uploaded_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    requirement_id uuid references public.service_requirements_metadata(id) on delete set null,
    subject_role text
  );
  create table public.application_logs (
    id uuid primary key default gen_random_uuid(),
    request_id uuid not null references public.requests(id) on delete cascade,
    performed_by_profile_id uuid references public.profiles(id) on delete set null,
    action_status varchar not null,
    remarks text,
    created_at timestamptz not null default now()
  );
  create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    request_id uuid not null references public.requests(id),
    recipient_email varchar not null, subject varchar not null, body text not null,
    status varchar not null default 'pending', is_read boolean not null default false
  );
  grant all on all tables in schema public to anon, authenticated, service_role;

  create function public.get_user_role() returns text language sql stable security definer as $$
    select role from public.profiles where id = auth.uid();
  $$;
  create function public.get_user_department_id() returns text language sql stable security definer
  set search_path = public as $$
    select department_id from public.profiles
    where id = (select auth.uid()) and access_status = 'active';
  $$;
  create function public.is_active_user() returns boolean language sql stable security definer
  set search_path = public as $$
    select exists (select 1 from public.profiles
      where id = (select auth.uid()) and access_status = 'active');
  $$;
  create function public.get_applicant_email(p_request_id uuid) returns text language sql stable
  security definer set search_path = public, auth as $$
    select au.email::text from auth.users au
    join public.requests r on r.applicant_id = au.id
    where r.id = p_request_id
      and public.get_user_role() = any (array['admin', 'staff', 'supervisor', 'cashier']);
  $$;
  create function public.guard_profile_access_fields() returns trigger language plpgsql
  set search_path = public as $$
  begin
    if current_user in ('anon', 'authenticated') and tg_op = 'UPDATE' and (
      new.role is distinct from old.role or new.access_status is distinct from old.access_status
    ) then
      raise exception 'Protected profile access fields cannot be changed directly';
    end if;
    return new;
  end;
  $$;
  create trigger guard_profile_access_fields before insert or update on public.profiles
    for each row execute function public.guard_profile_access_fields();
  create function public.handle_updated_at() returns trigger language plpgsql as $$
  begin new.updated_at := now(); return new; end;
  $$;
  create function public.fee_components_are_valid(components jsonb, fee numeric)
    returns boolean language sql immutable as $$ select true $$;
  create function public.auto_confirm_user() returns trigger language plpgsql security definer as $$
  begin return new; end;
  $$;

  alter table public.profiles enable row level security;
  alter table public.requests enable row level security;
  alter table public.requirements_attachments enable row level security;
  alter table public.application_logs enable row level security;
  alter table public.notifications enable row level security;
  alter table public.services_registry enable row level security;

  create policy "Anyone can view services" on public.services_registry for select using (true);

  create policy "Staff and admin can view all profiles" on public.profiles for select
    using (get_user_role() = any (array['admin', 'frontdesk', 'staff', 'archive', 'legal', 'cashier']));
  create policy "Users can view own profile" on public.profiles for select
    using ((select auth.uid()) = id);
  create policy "Users can update own profile" on public.profiles for update
    using ((select auth.uid()) = id);

  create policy "Applicants can view own requests" on public.requests for select
    using ((select auth.uid()) = applicant_id);
  create policy "Personnel can view permitted requests" on public.requests for select to authenticated
    using ((select is_active_user()) and (
      (select get_user_role()) = any (array['admin', 'cashier'])
      or ((select get_user_role()) = any (array['staff', 'supervisor']) and exists (
        select 1 from services_registry s
        where s.service_code = requests.request_type
          and s.department_id = (select get_user_department_id())))));
  create policy "Personnel can update permitted requests" on public.requests for update to authenticated
    using ((select is_active_user()) and (
      (select get_user_role()) = any (array['admin', 'cashier'])
      or ((select get_user_role()) = any (array['staff', 'supervisor']) and exists (
        select 1 from services_registry s
        where s.service_code = requests.request_type
          and s.department_id = (select get_user_department_id())))));
  create policy "Department personnel can create requests" on public.requests for insert to authenticated
    with check ((select is_active_user()) and (
      (select get_user_role()) = 'admin'
      or ((select get_user_role()) = any (array['staff', 'supervisor']) and exists (
        select 1 from services_registry s
        where s.service_code = requests.request_type
          and s.department_id = (select get_user_department_id())))));

  create policy "Applicants can upload attachments" on public.requirements_attachments for insert
    with check (exists (select 1 from requests r
      where r.id = requirements_attachments.request_id and r.applicant_id = (select auth.uid())));
  create policy "Applicants can view own attachments" on public.requirements_attachments for select
    using (exists (select 1 from requests r
      where r.id = requirements_attachments.request_id and r.applicant_id = (select auth.uid())));
  create policy "Applicants can resubmit own attachments" on public.requirements_attachments for update
    using (exists (select 1 from requests r
      where r.id = requirements_attachments.request_id and r.applicant_id = (select auth.uid())));
  create policy "Personnel can view permitted attachments" on public.requirements_attachments
    for select to authenticated
    using ((select is_active_user()) and (
      (select get_user_role()) = 'admin'
      or ((select get_user_role()) = any (array['staff', 'supervisor']) and exists (
        select 1 from requests r join services_registry s on s.service_code = r.request_type
        where r.id = requirements_attachments.request_id
          and s.department_id = (select get_user_department_id())))));
  create policy "Personnel can update permitted attachments" on public.requirements_attachments
    for update to authenticated
    using ((select is_active_user()) and (
      (select get_user_role()) = 'admin'
      or ((select get_user_role()) = any (array['staff', 'supervisor']) and exists (
        select 1 from requests r join services_registry s on s.service_code = r.request_type
        where r.id = requirements_attachments.request_id
          and s.department_id = (select get_user_department_id())))));

  create policy "Users can insert permitted logs" on public.application_logs for insert to authenticated
    with check ((select is_active_user()) and performed_by_profile_id = (select auth.uid()) and (
      exists (select 1 from requests r
        where r.id = application_logs.request_id and r.applicant_id = (select auth.uid()))
      or (select get_user_role()) = any (array['admin', 'cashier'])
      or ((select get_user_role()) = any (array['staff', 'supervisor']) and exists (
        select 1 from requests r join services_registry s on s.service_code = r.request_type
        where r.id = application_logs.request_id
          and s.department_id = (select get_user_department_id())))));
  create policy "Applicants can view own request logs" on public.application_logs for select
    using (exists (select 1 from requests r
      where r.id = application_logs.request_id and r.applicant_id = (select auth.uid())));
  create policy "Personnel can view permitted logs" on public.application_logs for select to authenticated
    using ((select is_active_user()) and (
      (select get_user_role()) = any (array['admin', 'cashier'])
      or ((select get_user_role()) = any (array['staff', 'supervisor']) and exists (
        select 1 from requests r join services_registry s on s.service_code = r.request_type
        where r.id = application_logs.request_id
          and s.department_id = (select get_user_department_id())))));

  create policy "Staff can insert notifications" on public.notifications for insert
    with check (get_user_role() = any (array['admin', 'staff', 'supervisor', 'cashier']));
  create policy "Staff can view all notifications" on public.notifications for select
    using (get_user_role() = any (array['admin', 'staff', 'supervisor', 'cashier']));
  create policy "Staff can update notification delivery status" on public.notifications for update
    using (get_user_role() = any (array['admin', 'staff', 'supervisor', 'cashier']))
    with check (get_user_role() = any (array['admin', 'staff', 'supervisor', 'cashier']));
  create policy "Applicants can view own notifications" on public.notifications for select
    using (exists (select 1 from requests r
      where r.id = notifications.request_id and r.applicant_id = (select auth.uid())));

  create policy "Applicants read their own document folder" on storage.objects for select to authenticated
    using (bucket_id = 'request-documents'
      and (storage.foldername(name))[1] = ((select auth.uid()))::text);
  create policy "Staff can read all uploaded documents" on storage.objects for select
    using (bucket_id = 'request-documents'
      and get_user_role() = any (array['admin', 'staff', 'supervisor', 'cashier']));
`;

const SEED = `
  insert into public.departments (id, name) values ('births', 'Births'), ('deaths', 'Deaths');
  insert into public.services_registry values ('BIRTH', 'births'), ('DEATH', 'deaths');
  insert into auth.users (id, email) values
    ('${APPLICANT}', 'applicant@example.com'), ('${OTHER_APPLICANT}', 'other@example.com'),
    ('${STAFF_A}', 'a@example.com'), ('${STAFF_B}', 'b@example.com'),
    ('${SUPERVISOR_A}', 'sup@example.com'), ('${CASHIER}', 'cash@example.com'),
    ('${ADMIN}', 'admin@example.com'), ('${SUSPENDED_STAFF}', 'gone@example.com'),
    ('${CITIZEN_WITHOUT_REQUESTS}', 'quiet@example.com');
  insert into public.profiles (id, first_name, last_name, role, department_id) values
    ('${APPLICANT}', 'Ana', 'Applicant', 'applicant', null),
    ('${CITIZEN_WITHOUT_REQUESTS}', 'Quinn', 'Quiet', 'applicant', null),
    ('${OTHER_APPLICANT}', 'Otto', 'Other', 'applicant', null),
    ('${STAFF_A}', 'Sam', 'Births', 'staff', 'births'),
    ('${STAFF_B}', 'Dee', 'Deaths', 'staff', 'deaths'),
    ('${SUPERVISOR_A}', 'Sue', 'Births', 'supervisor', 'births'),
    ('${CASHIER}', 'Cash', 'Ier', 'cashier', null),
    ('${ADMIN}', 'Ada', 'Admin', 'admin', null);
  insert into public.profiles (id, first_name, last_name, role, department_id, access_status,
    suspended_at, suspended_by, suspension_reason) values
    ('${SUSPENDED_STAFF}', 'Gone', 'Staff', 'staff', 'births', 'deactivated', now(), '${ADMIN}', 'Left');
  insert into public.requests (id, tracking_number, applicant_id, request_type, fees_due) values
    ('${REQUEST_A}', 'CCRO-2026-000001', '${APPLICANT}', 'BIRTH', 150),
    ('${REQUEST_B}', 'CCRO-2026-000002', '${OTHER_APPLICANT}', 'DEATH', 150);
  insert into public.requirements_attachments (id, request_id, requirement_name, file_url) values
    ('${ATTACHMENT_A}', '${REQUEST_A}', 'PSA copy', '${FILE_A}'),
    ('${ATTACHMENT_B}', '${REQUEST_B}', 'Death record', '${FILE_B}');
  insert into storage.objects (bucket_id, name) values
    ('request-documents', '${FILE_A}'), ('request-documents', '${FILE_B}');
  insert into public.application_logs (request_id, performed_by_profile_id, action_status, remarks) values
    ('${REQUEST_A}', '${STAFF_A}', 'document_reverted', 'Internal: scan looked edited');
  insert into public.notifications (request_id, recipient_email, subject, body) values
    ('${REQUEST_A}', 'applicant@example.com', 'Births update', '...'),
    ('${REQUEST_B}', 'other@example.com', 'Deaths update', '...');
`;

let db: PGlite;

async function as<T>(userId: string, run: () => Promise<T>): Promise<T> {
  await db.exec(`
    select set_config('request.jwt.claim.sub', '${userId}', false);
    select set_config('request.jwt.claim.role', 'authenticated', false);
    set role authenticated;
  `);
  try {
    return await run();
  } finally {
    await db.exec(`reset role;`);
  }
}

async function rows<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  return (await db.query<T>(sql)).rows;
}

async function requestA() {
  return (await rows<{ status: string; payment_status: string; or_number: string | null }>(
    `select status, payment_status, or_number from public.requests where id = '${REQUEST_A}'`,
  ))[0];
}

async function setRequestA(status: string, paymentStatus = "unpaid") {
  await db.exec(
    `update public.requests set status = '${status}', payment_status = '${paymentStatus}'
     where id = '${REQUEST_A}'`,
  );
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(BEFORE);
  await db.exec(HARDENING);
  await db.exec(RATE_LIMITS);
  await db.exec(PROFILE_SCOPE);
});

beforeEach(async () => {
  await db.exec(`
    reset role;
    truncate public.notifications, public.application_logs, public.requirements_attachments,
      public.requests, public.profiles, public.services_registry, public.departments,
      auth.users, storage.objects, public.rate_limit_hits cascade;
  `);
  await db.exec(SEED);
});

describe("applicant documents", () => {
  it("cannot approve their own upload", async () => {
    const updated = await as(APPLICANT, () =>
      rows(`update public.requirements_attachments set verification_status = 'approved'
            where id = '${ATTACHMENT_A}' returning id`),
    );
    expect(updated).toHaveLength(0);
    const [row] = await rows<{ verification_status: string }>(
      `select verification_status from public.requirements_attachments where id = '${ATTACHMENT_A}'`,
    );
    expect(row.verification_status).toBe("pending");
  });

  it("cannot attach another applicant's file to their own request", async () => {
    await expect(
      as(APPLICANT, () =>
        db.exec(`insert into public.requirements_attachments (request_id, requirement_name, file_url)
                 values ('${REQUEST_A}', 'Forged', '${FILE_B}')`),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("can still read their own attachments", async () => {
    const seen = await as(APPLICANT, () =>
      rows(`select id from public.requirements_attachments`),
    );
    expect(seen).toEqual([{ id: ATTACHMENT_A }]);
  });

  it("lets the server repoint a resubmitted file", async () => {
    await db.exec(`set role service_role`);
    await db.exec(`update public.requirements_attachments
      set file_url = '${APPLICANT}/resubmissions/new.pdf', verification_status = 'pending'
      where id = '${ATTACHMENT_A}'`);
    await db.exec(`reset role`);
    const [row] = await rows<{ file_url: string }>(
      `select file_url from public.requirements_attachments where id = '${ATTACHMENT_A}'`,
    );
    expect(row.file_url).toBe(`${APPLICANT}/resubmissions/new.pdf`);
  });
});

describe("staff document review", () => {
  it("can record a decision", async () => {
    await setRequestA("under_validation");
    await as(STAFF_A, () =>
      db.exec(`update public.requirements_attachments
               set verification_status = 'rejected', rejection_reason = 'Blurry'
               where id = '${ATTACHMENT_A}'`),
    );
    const [row] = await rows<{ verification_status: string }>(
      `select verification_status from public.requirements_attachments where id = '${ATTACHMENT_A}'`,
    );
    expect(row.verification_status).toBe("rejected");
  });

  it("cannot swap the file behind a document", async () => {
    await expect(
      as(STAFF_A, () =>
        db.exec(`update public.requirements_attachments set file_url = '${FILE_B}'
                 where id = '${ATTACHMENT_A}'`),
      ),
    ).rejects.toThrow(/Only the review decision/);
  });
});

describe("profiles", () => {
  it("staff cannot move themselves into another department", async () => {
    await expect(
      as(STAFF_A, () =>
        db.exec(`update public.profiles set department_id = 'deaths' where id = '${STAFF_A}'`),
      ),
    ).rejects.toThrow(/Protected profile access fields/);
  });

  it("anyone can still edit their own name", async () => {
    await as(APPLICANT, () =>
      db.exec(`update public.profiles set first_name = 'Anna' where id = '${APPLICANT}'`),
    );
    const [row] = await rows<{ first_name: string }>(
      `select first_name from public.profiles where id = '${APPLICANT}'`,
    );
    expect(row.first_name).toBe("Anna");
  });

  it("supervisors can see applicant names", async () => {
    const seen = await as(SUPERVISOR_A, () =>
      rows(`select id from public.profiles where id = '${APPLICANT}'`),
    );
    expect(seen).toHaveLength(1);
  });

  const visibleApplicants = (userId: string) =>
    as(userId, () =>
      rows<{ id: string }>(
        `select id from public.profiles where role = 'applicant' order by id`,
      ),
    ).then((found) => found.map((row) => row.id));

  it("staff only see the applicants of their own department's requests", async () => {
    expect(await visibleApplicants(STAFF_A)).toEqual([APPLICANT]);
    expect(await visibleApplicants(STAFF_B)).toEqual([OTHER_APPLICANT]);
  });

  it("the cashier and admin see every applicant with a request, and no one else", async () => {
    expect(await visibleApplicants(CASHIER)).toEqual([APPLICANT, OTHER_APPLICANT]);
    expect(await visibleApplicants(ADMIN)).toEqual([APPLICANT, OTHER_APPLICANT]);
  });

  it("personnel still see colleagues' names for logs and messages", async () => {
    const seen = await as(STAFF_A, () =>
      rows(`select id from public.profiles where id in ('${STAFF_B}', '${CASHIER}', '${ADMIN}')`),
    );
    expect(seen).toHaveLength(3);
  });

  it("applicants still see only themselves", async () => {
    const seen = await as(APPLICANT, () =>
      rows<{ id: string }>(`select id from public.profiles`),
    );
    expect(seen).toEqual([{ id: APPLICANT }]);
  });

  it("a deactivated account keeps no role in the database", async () => {
    const [{ role }] = await as(SUSPENDED_STAFF, () =>
      rows<{ role: string | null }>(`select public.get_user_role() as role`),
    );
    expect(role).toBeNull();
    const seen = await as(SUSPENDED_STAFF, () =>
      rows(`select id from public.profiles where id = '${APPLICANT}'`),
    );
    expect(seen).toHaveLength(0);
  });
});

describe("request workflow", () => {
  it("lets staff take an allowed step", async () => {
    await as(STAFF_A, () =>
      db.exec(`update public.requests set status = 'under_validation' where id = '${REQUEST_A}'`),
    );
    expect((await requestA()).status).toBe("under_validation");
  });

  it("stops staff skipping straight to released", async () => {
    await expect(
      as(STAFF_A, () =>
        db.exec(`update public.requests set status = 'released' where id = '${REQUEST_A}'`),
      ),
    ).rejects.toThrow(/cannot move from submitted to released/);
  });

  it("stops processing while a document is not accepted", async () => {
    await setRequestA("under_validation");
    await expect(
      as(STAFF_A, () =>
        db.exec(`update public.requests set status = 'processing' where id = '${REQUEST_A}'`),
      ),
    ).rejects.toThrow(/must be accepted/);

    await db.exec(`update public.requirements_attachments set verification_status = 'approved'
                   where id = '${ATTACHMENT_A}'`);
    await as(STAFF_A, () =>
      db.exec(`update public.requests set status = 'processing' where id = '${REQUEST_A}'`),
    );
    expect((await requestA()).status).toBe("processing");
  });

  it("keeps payment with the cashier", async () => {
    await setRequestA("ready_for_release");
    await expect(
      as(STAFF_A, () =>
        db.exec(`update public.requests set payment_status = 'verified', or_number = 'OR-1'
                 where id = '${REQUEST_A}'`),
      ),
    ).rejects.toThrow(/Only the cashier verifies payment/);
    await expect(
      as(ADMIN, () =>
        db.exec(`update public.requests set payment_status = 'verified' where id = '${REQUEST_A}'`),
      ),
    ).rejects.toThrow(/Only the cashier verifies payment/);
    await expect(
      as(STAFF_A, () =>
        db.exec(`update public.requests set status = 'released' where id = '${REQUEST_A}'`),
      ),
    ).rejects.toThrow(/Payment must be verified/);

    await as(CASHIER, () =>
      db.exec(`update public.requests set payment_status = 'verified', or_number = 'OR-1'
               where id = '${REQUEST_A}'`),
    );
    await as(STAFF_A, () =>
      db.exec(`update public.requests set status = 'released' where id = '${REQUEST_A}'`),
    );
    expect(await requestA()).toMatchObject({
      status: "released",
      payment_status: "verified",
      or_number: "OR-1",
    });
  });

  it("only lets the cashier verify a request that is ready, and only once", async () => {
    await setRequestA("processing");
    await expect(
      as(CASHIER, () =>
        db.exec(`update public.requests set payment_status = 'verified' where id = '${REQUEST_A}'`),
      ),
    ).rejects.toThrow(/Only the cashier verifies payment/);

    await setRequestA("ready_for_release", "verified");
    await expect(
      as(CASHIER, () =>
        db.exec(`update public.requests set or_number = 'OR-2' where id = '${REQUEST_A}'`),
      ),
    ).rejects.toThrow(/Only the cashier verifies payment/);
  });

  it("does not let the cashier move a request", async () => {
    await setRequestA("ready_for_release", "verified");
    await expect(
      as(CASHIER, () =>
        db.exec(`update public.requests set status = 'released' where id = '${REQUEST_A}'`),
      ),
    ).rejects.toThrow(/Only CCRO staff/);
  });

  it("freezes what the applicant submitted", async () => {
    await expect(
      as(STAFF_A, () =>
        db.exec(`update public.requests set fees_due = 0 where id = '${REQUEST_A}'`),
      ),
    ).rejects.toThrow(/cannot be changed directly/);
    await expect(
      as(ADMIN, () =>
        db.exec(`update public.requests set form_data = '{"subject_last_name":"X"}'
                 where id = '${REQUEST_A}'`),
      ),
    ).rejects.toThrow(/cannot be changed directly/);
  });

  it("lets staff encode a walk-in, but only as a new unpaid request", async () => {
    await as(STAFF_A, () =>
      db.exec(`insert into public.requests (tracking_number, request_type, status)
               values ('CCRO-2026-000003', 'BIRTH', 'submitted')`),
    );
    await expect(
      as(STAFF_A, () =>
        db.exec(`insert into public.requests (tracking_number, request_type, status, payment_status)
                 values ('CCRO-2026-000004', 'BIRTH', 'released', 'verified')`),
      ),
    ).rejects.toThrow(/starts submitted and unpaid/);
  });

  it("leaves the server's own writes alone", async () => {
    await db.exec(`set role service_role`);
    await db.exec(`update public.requests set status = 'released', fees_due = 0
                   where id = '${REQUEST_A}'`);
    await db.exec(`reset role`);
    expect((await requestA()).status).toBe("released");
  });
});

describe("audit trail", () => {
  it("applicants cannot write log entries", async () => {
    await expect(
      as(APPLICANT, () =>
        db.exec(`insert into public.application_logs (request_id, performed_by_profile_id, action_status)
                 values ('${REQUEST_A}', '${APPLICANT}', 'payment_verified')`),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("staff log in their department, but never a payment", async () => {
    await as(STAFF_A, () =>
      db.exec(`insert into public.application_logs (request_id, performed_by_profile_id, action_status)
               values ('${REQUEST_A}', '${STAFF_A}', 'under_validation')`),
    );
    await expect(
      as(STAFF_A, () =>
        db.exec(`insert into public.application_logs (request_id, performed_by_profile_id, action_status)
                 values ('${REQUEST_A}', '${STAFF_A}', 'payment_verified')`),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(STAFF_A, () =>
        db.exec(`insert into public.application_logs (request_id, performed_by_profile_id, action_status)
                 values ('${REQUEST_B}', '${STAFF_A}', 'under_validation')`),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("the cashier logs payments only", async () => {
    await as(CASHIER, () =>
      db.exec(`insert into public.application_logs (request_id, performed_by_profile_id, action_status)
               values ('${REQUEST_A}', '${CASHIER}', 'payment_verified')`),
    );
    await expect(
      as(CASHIER, () =>
        db.exec(`insert into public.application_logs (request_id, performed_by_profile_id, action_status)
                 values ('${REQUEST_A}', '${CASHIER}', 'released')`),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("hides staff-only reopen notes from the applicant", async () => {
    const seen = await as(APPLICANT, () =>
      rows(`select action_status from public.application_logs`),
    );
    expect(seen).toHaveLength(0);
    const staffSeen = await as(STAFF_A, () =>
      rows(`select action_status from public.application_logs`),
    );
    expect(staffSeen).toHaveLength(1);
  });
});

describe("notifications", () => {
  it("staff only see their department's applicant notifications", async () => {
    const seen = await as(STAFF_A, () =>
      rows<{ subject: string }>(`select subject from public.notifications`),
    );
    expect(seen.map((row) => row.subject)).toEqual(["Births update"]);
  });

  it("staff cannot post into another department's applicant feed", async () => {
    await expect(
      as(STAFF_A, () =>
        db.exec(`insert into public.notifications (request_id, recipient_email, subject, body)
                 values ('${REQUEST_B}', 'other@example.com', 'Spoof', '...')`),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("applicant emails are only handed out within scope", async () => {
    const [{ email: own }] = await as(STAFF_A, () =>
      rows<{ email: string | null }>(`select public.get_applicant_email('${REQUEST_A}') as email`),
    );
    const [{ email: other }] = await as(STAFF_A, () =>
      rows<{ email: string | null }>(`select public.get_applicant_email('${REQUEST_B}') as email`),
    );
    expect(own).toBe("applicant@example.com");
    expect(other).toBeNull();
  });
});

describe("uploaded document storage", () => {
  const visible = (userId: string) =>
    as(userId, () => rows<{ name: string }>(`select name from storage.objects order by name`)).then(
      (found) => found.map((row) => row.name),
    );

  it("scopes staff to their department's attached files", async () => {
    expect(await visible(STAFF_A)).toEqual([FILE_A]);
    expect(await visible(STAFF_B)).toEqual([FILE_B]);
    expect(await visible(ADMIN)).toEqual([FILE_A, FILE_B].sort());
  });

  it("gives the cashier and inactive staff nothing", async () => {
    expect(await visible(CASHIER)).toEqual([]);
    expect(await visible(SUSPENDED_STAFF)).toEqual([]);
  });

  it("keeps applicants to their own folder", async () => {
    expect(await visible(APPLICANT)).toEqual([FILE_A]);
  });

  it("limits what the bucket accepts", async () => {
    const [bucket] = await rows<{ file_size_limit: string; allowed_mime_types: string[] }>(
      `select file_size_limit, allowed_mime_types from storage.buckets where id = 'request-documents'`,
    );
    expect(Number(bucket.file_size_limit)).toBe(10 * 1024 * 1024);
    expect(bucket.allowed_mime_types).toEqual(["image/jpeg", "image/png", "application/pdf"]);
  });
});

describe("leftovers", () => {
  it("drops the unused auto-confirm trigger function", async () => {
    const found = await rows(`select 1 from pg_proc where proname = 'auto_confirm_user'`);
    expect(found).toHaveLength(0);
  });
});

describe("consume_rate_limit", () => {
  const consume = async (bucket: string) =>
    (
      await rows<{ allowed: boolean }>(
        `select public.consume_rate_limit('${bucket}', 3, 60) as allowed`,
      )
    )[0].allowed;

  it("allows up to the limit, then refuses", async () => {
    expect([await consume("k"), await consume("k"), await consume("k")]).toEqual([
      true,
      true,
      true,
    ]);
    expect(await consume("k")).toBe(false);
    expect(await consume("other")).toBe(true);
  });

  it("lets the caller back in once the window has passed", async () => {
    for (let i = 0; i < 3; i++) await consume("k");
    expect(await consume("k")).toBe(false);
    await db.exec(`update public.rate_limit_hits set hit_at = now() - interval '61 seconds'`);
    expect(await consume("k")).toBe(true);
  });

  it("is out of reach of signed-in users", async () => {
    await expect(
      as(APPLICANT, () => rows(`select public.consume_rate_limit('k', 3, 60)`)),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(APPLICANT, () => rows(`select * from public.rate_limit_hits`)),
    ).rejects.toThrow(/permission denied/);
  });
});
