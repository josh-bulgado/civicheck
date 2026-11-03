import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const migration = readFileSync(new URL("../../../supabase/migrations/20261103145806_marriage_posting_period.sql", import.meta.url), "utf8");

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create function public.get_user_role() returns text language sql as $$
      select current_setting('test.actor_role', true)
    $$;
    create table public.requests (
      id int primary key, request_type text, status text,
      created_at timestamptz default now() - interval '60 days'
    );
    grant all on public.requests to authenticated;
  `);
  await db.exec(migration);
}, 30_000);
afterAll(() => db.close());

async function attempt(sql: string, role = "staff") {
  await db.exec("begin; set local role authenticated;");
  try {
    await db.query("select set_config('test.actor_role', $1, true)", [role]);
    return await db.exec(sql);
  } finally {
    await db.exec("rollback");
  }
}

describe("database marriage posting guard", () => {
  beforeAll(async () => {
    await db.exec(`insert into requests(id,request_type,status) values
      (1,'MARRIAGE_DELAYED','processing'), (2,'MARRIAGE_ONTIME','processing'),
      (3,'MARRIAGE_DELAYED','under_validation');`);
  });
  it("blocks direct readiness and release without posting", async () => {
    for (const status of ["ready_for_release", "released"]) {
      await expect(attempt(`update requests set status='${status}' where id=1`)).rejects.toThrow(/Complete the 10-calendar-day/);
    }
  });
  it("calculates the end date instead of trusting a supplied end date", async () => {
    await db.exec("begin; set local role authenticated; select set_config('test.actor_role','staff',true);");
    try {
      await db.exec(`update requests set posting_start_date=(now() at time zone 'Asia/Manila')::date,
        posting_end_date=(now() at time zone 'Asia/Manila')::date - 100 where id=1`);
      const { rows } = await db.query<{ days: number }>("select posting_end_date-posting_start_date as days from requests where id=1");
      expect(rows[0].days).toBe(10);
      await expect(db.exec("update requests set status='ready_for_release' where id=1")).rejects.toThrow(/Complete the 10-calendar-day/);
    } finally { await db.exec("rollback"); }
  });
  it("allows readiness at the completion boundary and does not advance automatically", async () => {
    await expect(attempt(`
      update requests set posting_start_date=(now() at time zone 'Asia/Manila')::date-10 where id=1;
      do $$ begin
        if (select status from requests where id=1) <> 'processing' then raise exception 'Advanced automatically'; end if;
      end $$;
      update requests set status='ready_for_release' where id=1;
    `)).resolves.toBeDefined();
  });
  it("rejects future dates, dates before the request and dates outside processing", async () => {
    await expect(attempt("update requests set posting_start_date=current_date+2 where id=1")).rejects.toThrow(/future/);
    await expect(attempt("update requests set posting_start_date=current_date-100 where id=1")).rejects.toThrow(/precede/);
    await expect(attempt("update requests set posting_start_date=current_date where id=3")).rejects.toThrow(/during Processing/);
    await expect(attempt("insert into requests(id,request_type,status,posting_start_date) values (4,'MARRIAGE_DELAYED','submitted',current_date)")).rejects.toThrow(/during Processing/);
  });
  it.each(["applicant", "cashier", "system_admin", ""])("denies date writes by %s", async (role) => {
    await expect(attempt("update requests set posting_start_date=current_date where id=1", role)).rejects.toThrow(/Only CCRO staff/);
  });
  it("leaves other services unaffected", async () => {
    await expect(attempt("update requests set status='ready_for_release' where id=2")).resolves.toBeDefined();
  });
});
