import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261105130000_paginate_request_queue.sql",
    import.meta.url,
  ),
  "utf8",
);
const viewer = "00000000-0000-4000-8000-000000000001";

type QueueResult = {
  rows: Array<Record<string, unknown>>;
  total: number;
  page: number;
  requestCount: number;
  waitingCount: number;
  attentionCount: number;
  stageCounts: Record<string, number>;
};

async function queue(argumentsSql = "") {
  const { rows } = await db.query<{ result: QueueResult }>(
    `select public.get_request_queue_page(p_now => '2026-10-10T00:00:00Z'${argumentsSql}) as result`,
  );
  return rows[0].result;
}

beforeAll(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('test.user_id', true), '')::uuid
    $$;
    create function public.is_active_user() returns boolean language sql stable as $$
      select true
    $$;
    create function public.get_user_role() returns text language sql stable as $$
      select 'staff'
    $$;
    create table public.departments (id text primary key, name text not null);
    create table public.services_registry (
      service_code text primary key, name text, display_name text, department_id text references departments
    );
    create table public.profiles (
      id uuid primary key, first_name text, last_name text
    );
    create table public.requests (
      id uuid primary key, tracking_number text not null, request_type text,
      status text not null, payment_status text not null, fees_due numeric,
      form_data jsonb, applicant_id uuid references profiles,
      created_at timestamptz not null, updated_at timestamptz not null,
      claimed_by uuid references profiles, claimed_stage text,
      claimed_at timestamptz, claim_expires_at timestamptz
    );
    grant usage on schema public, auth to authenticated;
    grant select on public.departments, public.services_registry, public.profiles, public.requests to authenticated;
    grant execute on function auth.uid() to authenticated;

    insert into departments values ('civil', 'Civil Registry');
    insert into services_registry values ('BIRTH', 'Birth certificate', 'Birth Certificate', 'civil');
    insert into profiles values
      ('${viewer}', 'Casey', 'Clerk'),
      ('00000000-0000-4000-8000-000000000002', 'Alice', 'Applicant');
    insert into requests values
      ('10000000-0000-4000-8000-000000000001', 'CCRO-2026-000001', 'BIRTH', 'submitted', 'unpaid', 100, '{}',
       '00000000-0000-4000-8000-000000000002', '2026-10-01', '2026-10-01', '${viewer}', 'submitted', '2026-10-09', '2026-10-11'),
      ('10000000-0000-4000-8000-000000000002', 'CCRO-2026-000002', 'BIRTH', 'incomplete', 'unpaid', 100, '{"subject_first_name":"Walk","subject_last_name":"In"}',
       null, '2026-10-02', '2026-10-02', null, null, null, null),
      ('10000000-0000-4000-8000-000000000003', 'CCRO-2026-000003', 'BIRTH', 'ready_for_release', 'unpaid', 100, '{}',
       null, '2026-10-03', '2026-10-03', null, null, null, null),
      ('10000000-0000-4000-8000-000000000004', 'CCRO-2026-000004', 'BIRTH', 'released', 'verified', 100, '{}',
       null, '2026-10-04', '2026-10-04', null, null, null, null);
  `);
  await db.exec(migration);
  await db.exec(`select set_config('test.user_id', '${viewer}', false); set role authenticated;`);
}, 30_000);

afterAll(() => db.close());

describe("request queue pagination", () => {
  it("returns one ordered page and exact queue counts", async () => {
    const result = await queue(", p_page_size => 2");

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].tracking_number).toBe("CCRO-2026-000001");
    expect(result.rows[0]).not.toHaveProperty("form_data");
    expect(result).toMatchObject({
      total: 4,
      page: 0,
      requestCount: 4,
      waitingCount: 1,
      attentionCount: 1,
      stageCounts: { all: 4, 1: 1, 2: 1, 3: 0, 4: 2 },
    });
  });

  it("filters before counting and paging", async () => {
    const search = await queue(", p_search => 'Alice'");
    const mine = await queue(", p_mine => true");

    expect(search.total).toBe(1);
    expect(search.rows[0].applicant_name).toBe("Alice Applicant");
    expect(mine.total).toBe(1);
    expect(mine.rows[0].tracking_number).toBe("CCRO-2026-000001");
  });
});
