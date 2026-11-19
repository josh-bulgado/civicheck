import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

const db = new PGlite();
const actor = "00000000-0000-4000-8000-000000000001";
const request = "00000000-0000-4000-8000-000000000002";
const version = "2026-11-01T00:00:00Z";
const sql = (name: string) => readFileSync(new URL(`../../../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
const save = (action: string, values: Record<string, unknown>, status = "processing") => db.query(
  "select save_staff_request_action($1,$2,$3,$4::jsonb,'Note')", [request, status, action, JSON.stringify(values)],
);
let today: string;
let yesterday: string;
let older: string;

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql as $$select '${actor}'::uuid$$;
    create function get_user_role() returns text language sql as $$select current_setting('test.role')$$;
    create table requests(id uuid primary key,tracking_number text,applicant_id uuid,request_type text,status text,
      payment_status text,fees_due numeric,or_number text,copies integer,form_data jsonb,form_template_version_id uuid,
      created_at timestamptz,updated_at timestamptz,posting_start_date date,claimed_by uuid,claimed_stage text,
      claimed_at timestamptz,claim_expires_at timestamptz);
    create table requirements_attachments(id uuid,request_id uuid,verification_status text,rejection_reason text);
    create table application_logs(request_id uuid,performed_by_profile_id uuid,action_status text,remarks text);
    create function fail_history() returns trigger language plpgsql as $$begin
      if current_setting('test.fail_history',true)='yes' then raise exception 'History unavailable'; end if; return new; end$$;
    create trigger fail_history before insert on application_logs for each row execute function fail_history();
    grant usage on schema public,auth to authenticated;
    grant select,update,insert on requests,requirements_attachments to authenticated;
    grant select,insert on application_logs to authenticated;`);
  await db.exec(sql("20261106015601_atomic_staff_request_actions"));
  const security = sql("20261027120000_security_hardening");
  const start = security.indexOf("create or replace function public.guard_request_workflow()");
  await db.exec(security.slice(start, security.indexOf("$$;", start) + 3));
  await db.exec("create trigger guard_request_workflow before insert or update on requests for each row execute function guard_request_workflow()");
  await db.exec(sql("20261113022118_electronic_endorsement_psa_release"));
  await db.exec(sql("20261113025807_allow_endorsement_payment_during_processing"));
  const dates = (await db.query<{today: string; yesterday: string; older: string}>("select (now() at time zone 'Asia/Manila')::date::text as today, ((now() at time zone 'Asia/Manila')::date-1)::text as yesterday, ((now() at time zone 'Asia/Manila')::date-40)::text as older")).rows[0];
  today = dates.today; yesterday = dates.yesterday; older = dates.older;
}, 30000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec(`reset role; set test.role='staff'; set test.fail_history='no';
    delete from application_logs; delete from requests;
    insert into requests(id,request_type,status,payment_status,fees_due,form_data,created_at,updated_at,claimed_by,claimed_stage,claim_expires_at)
    values('${request}','ELEC_ENDORSEMENT','processing','unpaid',100,'{}',now()-interval '90 days','${version}','${actor}','processing',now()+interval '15 minutes');
    set role authenticated;`);
});
const details = () => ({ psa_endorsed_on: yesterday, claiming_location: "Confirmed collection desk",
  claiming_instructions: "Bring the claim slip and valid ID.", expected_updated_at: version });
async function ready(confirmed = true) {
  const row = (await db.query<{updated_at: string}>("select updated_at from requests")).rows[0];
  return save("status", { status: "ready_for_release", psa_certificate_available_confirmed: confirmed, expected_updated_at: row.updated_at });
}

it("saves endorsement details and the staff audit without advancing status or payment", async () => {
  await save("endorsement_updated", details());
  expect((await db.query("select status,payment_status,claiming_location,psa_endorsed_on::text,psa_certificate_available_at from requests")).rows[0])
    .toEqual({status:"processing",payment_status:"unpaid",claiming_location:"Confirmed collection desk",psa_endorsed_on:yesterday,psa_certificate_available_at:null});
  expect((await db.query("select performed_by_profile_id,action_status from application_logs")).rows[0])
    .toEqual({performed_by_profile_id:actor,action_status:"endorsement_updated"});
});
it("requires saved claiming details and explicit availability confirmation, even after a month", async () => {
  await expect(ready()).rejects.toThrow(/Confirm the final PSA certificate/);
  await save("endorsement_updated", {...details(),psa_endorsed_on:older});
  await expect(ready(false)).rejects.toThrow(/Confirm the final PSA certificate/);
  expect((await db.query("select status from requests")).rows[0]).toEqual({status:"processing"});
});
it("allows actual availability before the estimate and records confirmation", async () => {
  await save("endorsement_updated", details());
  await ready();
  const row = (await db.query<{status: string; psa_certificate_available_at: string|null}>("select status,psa_certificate_available_at from requests")).rows[0];
  expect(row.status).toBe("ready_for_release");
  expect(row.psa_certificate_available_at).toBeTruthy();
  expect((await db.query<{remarks: string}>("select remarks from application_logs where action_status='ready_for_release'")).rows[0].remarks)
    .toContain("Claiming location: Confirmed collection desk");
});
it.each(["claiming_location","claiming_instructions"])("blocks readiness with blank %s", async field => {
  await save("endorsement_updated", {...details(),[field]:"   "});
  await expect(ready()).rejects.toThrow(/Confirm the final PSA certificate/);
});
it("blocks stale edits and a lost processing claim", async () => {
  await expect(save("endorsement_updated", {...details(),expected_updated_at:"2000-01-01T00:00:00Z"})).rejects.toThrow(/request changed/);
  await db.exec("update requests set claim_expires_at=now()-interval '1 second'");
  await expect(save("endorsement_updated", details())).rejects.toThrow(/claim changed or expired/);
});
it("blocks direct writes that bypass audit and availability confirmation", async () => {
  await expect(db.exec(`update requests set psa_endorsed_on='${today}'`)).rejects.toThrow(/claimed Processing action/);
  await save("endorsement_updated", details());
  await expect(db.exec("update requests set status='ready_for_release'")).rejects.toThrow(/Confirm the final PSA certificate/);
  await expect(db.exec("update requests set psa_certificate_available_at=now()")).rejects.toThrow(/ready-for-release action/);
});
it("rejects future, missing, and pre-submission dates", async () => {
  for (const date of ["2999-01-01",null,"1900-01-01"])
    await expect(save("endorsement_updated", {...details(),psa_endorsed_on:date})).rejects.toThrow(/actual PSA endorsement date/);
});
it("rolls back details and availability when audit recording fails", async () => {
  await db.exec("set test.fail_history='yes'");
  await expect(save("endorsement_updated", details())).rejects.toThrow("History unavailable");
  expect((await db.query("select psa_endorsed_on from requests")).rows[0]).toEqual({psa_endorsed_on:null});
  await db.exec("set test.fail_history='no'");
  await save("endorsement_updated", details());
  await db.exec("set test.fail_history='yes'");
  await expect(ready()).rejects.toThrow("History unavailable");
  expect((await db.query("select status,psa_certificate_available_at from requests")).rows[0]).toEqual({status:"processing",psa_certificate_available_at:null});
});
it("leaves other services' readiness behavior unchanged", async () => {
  await db.exec("reset role; update requests set request_type='CTC-LOCAL'; set role authenticated");
  await save("status",{status:"ready_for_release"});
  expect((await db.query("select status from requests")).rows[0]).toEqual({status:"ready_for_release"});
});

it("rejects a readiness confirmation based on stale claiming instructions", async () => {
  await save("endorsement_updated", details());
  await expect(save("status", { status:"ready_for_release",psa_certificate_available_confirmed:true,expected_updated_at:version }))
    .rejects.toThrow(/Refresh and review the claiming instructions/);
});

it("clears availability after staff reopen validation", async () => {
  await save("endorsement_updated", details());
  await ready();
  await db.exec("update requests set status='under_validation'");
  expect((await db.query("select psa_certificate_available_at from requests")).rows[0])
    .toEqual({psa_certificate_available_at:null});
});

it("refuses a cashier updating endorsement details", async () => {
  await db.exec("set test.role='cashier'");
  await expect(save("endorsement_updated", details())).rejects.toThrow(/Staff access required/);
});

it("accepts cashier payment without an endorsement date while keeping Processing", async () => {
  await db.exec("set test.role='cashier'");
  await save("payment_verified", {or_number:"OR-123",fees_due:100});
  expect((await db.query("select status,payment_status,psa_certificate_available_at from requests")).rows[0])
    .toEqual({status:"processing",payment_status:"verified",psa_certificate_available_at:null});
});
