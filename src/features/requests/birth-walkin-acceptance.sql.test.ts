import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

const db = new PGlite();
const actor = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const requestId = "00000000-0000-4000-8000-000000000003";
const migration = readFileSync(new URL("../../../supabase/migrations/20261110073609_accept_checked_birth_walkins.sql", import.meta.url), "utf8");
const previous = readFileSync(new URL("../../../supabase/migrations/20261029120000_hold_documents_through_release.sql", import.meta.url), "utf8").match(/create or replace function public\.guard_request_workflow\(\)[\s\S]*?\$\$;/i)![0];

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql as $$ select '${actor}'::uuid $$;
    create function get_user_role() returns text language sql as $$ select current_setting('test.role') $$;
    create function get_user_department_id() returns uuid language sql as $$ select '${other}'::uuid $$;
    create table profiles(id uuid primary key);
    insert into profiles values('${actor}'),('${other}');
    create table services_registry(service_code text,department_id uuid);
    insert into services_registry values('OTCOLB-MARITAL','${other}'),('DCOLB-0079-BRAP','${other}');
    create table requests(id uuid primary key default gen_random_uuid(),tracking_number text,applicant_id uuid,request_type text,
      form_data jsonb default '{}',status text default 'submitted',payment_status text default 'unpaid',or_number text,
      fees_due numeric default 0,copies integer default 1,form_template_version_id uuid,created_at timestamptz default now());
    create table requirements_attachments(request_id uuid,verification_status text);
    create table application_logs(request_id uuid,performed_by_profile_id uuid,action_status text,remarks text,created_at timestamptz default clock_timestamp());
    create function fail_history() returns trigger language plpgsql as $$ begin
      if current_setting('test.fail_history',true)='yes' then raise exception 'History unavailable'; end if;
      return new; end $$;
    create trigger fail_history before insert on application_logs for each row execute function fail_history();
    grant usage on schema public,auth to authenticated;
    grant select,insert,update,delete on requests,requirements_attachments,application_logs to authenticated;
    grant select on profiles,services_registry to authenticated;`);
  await db.exec(previous);
  await db.exec("create trigger guard_request_workflow before insert or update on requests for each row execute function guard_request_workflow()");
  await db.exec(migration);
  await db.exec(migration);
  const marriageMigration = readFileSync(new URL("../../../supabase/migrations/20261110104615_accept_checked_marriage_walkins.sql", import.meta.url), "utf8");
  await db.exec(marriageMigration);
  await db.exec(marriageMigration);
  const deathMigration = readFileSync(new URL("../../../supabase/migrations/20261110130610_accept_checked_death_walkins.sql", import.meta.url), "utf8");
  await db.exec(deathMigration);
  await db.exec(deathMigration);
  const legitimationMigration = readFileSync(new URL("../../../supabase/migrations/20261110142639_accept_checked_legitimation_walkins.sql", import.meta.url), "utf8");
  await db.exec(legitimationMigration);
  await db.exec(legitimationMigration);
  await db.exec(`insert into services_registry values('LEGITIMATION','${other}')`);
  await db.exec(`insert into services_registry values('DEATH_ONTIME','${other}'),('DEATH_DELAYED','${other}')`);
  await db.exec(`insert into services_registry values('MARRIAGE_ONTIME','${other}'),('MARRIAGE_DELAYED','${other}')`);
}, 30_000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec("reset role; set test.role='staff'; set test.fail_history='no'; delete from application_logs; delete from requests; set role authenticated");
});

async function insert(patch: Record<string, unknown> = {}) {
  const values = {request_type: "OTCOLB-MARITAL", status: "processing", applicant_id: null,
    form_data: {intake_channel: "walk_in"}, walk_in_accepted_by: actor, payment_status: "unpaid", ...patch};
  const keys = Object.keys(values);
  return db.query<{status: string; payment_status: string; walk_in_accepted_by: string; walk_in_accepted_at: string}>(`insert into requests(id,${keys.join(",")}) values($1,${keys.map((_, i) => `$${i+2}`).join(",")}) returning *`,
    [requestId,...Object.values(values).map((value) => value && typeof value === "object" ? JSON.stringify(value) : value)]);
}

it("records staff acceptance, time, and processing history together", async () => {
  const result = await insert({walk_in_accepted_at: "1900-01-01"});
  expect(result.rows[0]).toMatchObject({status: "processing",payment_status: "unpaid",walk_in_accepted_by: actor});
  expect(String(result.rows[0].walk_in_accepted_at)).not.toContain("1900");
  expect((await db.query("select performed_by_profile_id,action_status from application_logs order by created_at")).rows)
    .toEqual([{performed_by_profile_id: actor,action_status: "walk_in_accepted"},{performed_by_profile_id: actor,action_status: "processing"}]);
});
it("accepts legitimation only with the couple present and records it in History", async () => {
  const input = { request_type: "LEGITIMATION", form_data: { intake_channel: "walk_in", couple_appearance_confirmed: "true" } };
  for (const value of [undefined, false, "false"]) {
    await expect(insert({ ...input, form_data: { intake_channel: "walk_in", couple_appearance_confirmed: value } })).rejects.toThrow(/both parents/);
  }
  await expect(insert({ ...input, walk_in_accepted_by: null })).rejects.toThrow();
  await expect(insert({ ...input, walk_in_accepted_by: other })).rejects.toThrow();
  await expect(insert({ ...input, payment_status: "verified" })).rejects.toThrow();
  await db.exec("reset role; update services_registry set department_id=null where service_code='LEGITIMATION'; set role authenticated");
  await expect(insert(input)).rejects.toThrow(/department/);
  await db.exec(`reset role; update services_registry set department_id='${other}' where service_code='LEGITIMATION'; set role authenticated`);
  const result = await insert(input);
  expect(result.rows[0]).toMatchObject({ status: "processing", payment_status: "unpaid", walk_in_accepted_by: actor });
  const logs = (await db.query<{ remarks: string }>("select remarks from application_logs order by created_at")).rows;
  expect(logs[0].remarks).toContain("Both parents personally appeared");
  expect(logs[1].remarks).toContain("legitimation request");
});
it.each(["MARRIAGE_ONTIME", "MARRIAGE_DELAYED"])("accepts checked %s papers with marriage audit history", async (request_type) => {
  const result = await insert({ request_type });
  expect(result.rows[0]).toMatchObject({ status: "processing", payment_status: "unpaid", walk_in_accepted_by: actor });
  expect((await db.query<{ remarks: string }>("select remarks from application_logs where action_status='processing'")).rows[0].remarks).toContain("marriage request");
});
it.each(["MARRIAGE_ONTIME", "MARRIAGE_DELAYED"])("keeps %s acceptance within the department and protects payment", async (request_type) => {
  await db.exec(`reset role; update services_registry set department_id=null where service_code='${request_type}'; set role authenticated`);
  await expect(insert({ request_type })).rejects.toThrow(/department/);
  await db.exec(`reset role; update services_registry set department_id='${other}' where service_code='${request_type}'; set role authenticated`);
  await expect(insert({ request_type, payment_status: "verified" })).rejects.toThrow();
  await expect(insert({ request_type, walk_in_accepted_by: other })).rejects.toThrow();
});
it("does not save an accepted request if its audit history fails", async () => {
  await db.exec("set test.fail_history='yes'");
  await expect(insert()).rejects.toThrow("History unavailable");
  expect((await db.query("select * from requests")).rows).toHaveLength(0);
  expect((await db.query("select * from application_logs")).rows).toHaveLength(0);
});
it.each([
  {walk_in_accepted_by: null}, {walk_in_accepted_by: other}, {applicant_id: actor},
  {request_type: "CTC-LOCAL"}, {form_data: {intake_channel: "online"}}, {status: "ready_for_release"},
  {status: "released"}, {payment_status: "verified"}, {or_number: "fake"},
])("rejects bypassing the accepted-birth intake boundary: %j", async (patch) => {
  await expect(insert(patch)).rejects.toThrow();
  expect((await db.query("select * from requests")).rows).toHaveLength(0);
});
it("rejects non-staff acceptance", async () => {
  await db.exec("set test.role='applicant'");
  await expect(insert()).rejects.toThrow(/Only staff/);
});
it("checks the department even for direct database inserts", async () => {
  await db.exec("reset role; update services_registry set department_id=null where service_code='OTCOLB-MARITAL'; set role authenticated");
  await expect(insert()).rejects.toThrow(/department/);
  await db.exec(`reset role; update services_registry set department_id='${other}' where service_code='OTCOLB-MARITAL'; set role authenticated`);
});
it("preserves ordinary submitted intake without acceptance metadata", async () => {
  const result = await insert({request_type: "CTC-LOCAL",status: "submitted",walk_in_accepted_by: null});
  expect(result.rows[0].status).toBe("submitted");
  expect((await db.query("select * from application_logs")).rows).toHaveLength(0);
});
it("keeps payment, release transitions, and acceptance history protected", async () => {
  await insert();
  await expect(db.exec("update requests set status='released'")).rejects.toThrow(/cannot move/);
  await expect(db.exec("update requests set payment_status='verified'")).rejects.toThrow(/Only the cashier/);
  await expect(db.exec("update requests set walk_in_accepted_by=null")).rejects.toThrow(/cannot be changed/);
  await db.exec("update requests set status='under_validation'");
  expect((await db.query<{status: string}>("select status from requests")).rows[0].status).toBe("under_validation");
});

it.each(["DEATH_ONTIME", "DEATH_DELAYED"])("accepts checked %s documents with death audit history", async request_type => {
  const result = await insert({ request_type });
  expect(result.rows[0]).toMatchObject({ status: "processing", payment_status: "unpaid", walk_in_accepted_by: actor });
  expect((await db.query<{remarks: string}>("select remarks from application_logs where action_status='processing'")).rows[0].remarks).toContain("death request");
});
it.each(["DEATH_ONTIME", "DEATH_DELAYED"])("protects %s department, payment and acceptance identity", async request_type => {
  await db.exec(`reset role; update services_registry set department_id=null where service_code='${request_type}'; set role authenticated`);
  await expect(insert({ request_type })).rejects.toThrow(/department/);
  await db.exec(`reset role; update services_registry set department_id='${other}' where service_code='${request_type}'; set role authenticated`);
  await expect(insert({ request_type, payment_status: "verified" })).rejects.toThrow();
  await expect(insert({ request_type, walk_in_accepted_by: other })).rejects.toThrow();
  await expect(insert({ request_type, walk_in_accepted_by: null })).rejects.toThrow();
});
