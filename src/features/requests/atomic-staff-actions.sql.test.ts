import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

const db = new PGlite();
const staff = "00000000-0000-4000-8000-000000000001";
const request = "00000000-0000-4000-8000-000000000002";
const attachment = "00000000-0000-4000-8000-000000000003";
const migration = readFileSync(new URL("../../../supabase/migrations/20261106015601_atomic_staff_request_actions.sql", import.meta.url), "utf8");
const save = (action = "status", values = { status: "processing" } as Record<string, unknown>, expected = "under_validation", decision: string | null = null, remarks = "Review note") =>
  db.query("select save_staff_request_action($1,$2,$3,$4::jsonb,$5,$6,$7) as returned", [
    request, expected, action, JSON.stringify(values), remarks, attachment, decision,
  ]);

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$ select '${staff}'::uuid $$;
    create function get_user_role() returns text language sql as $$ select current_setting('test.role') $$;
    create table requests(id uuid primary key, request_type text default 'CTC_ISSUANCE', status text, claimed_by uuid, claimed_stage text,
      claimed_at timestamptz, claim_expires_at timestamptz, updated_at timestamptz,
      posting_start_date date, payment_status text, fees_due numeric, or_number text, copies integer default 1);
    create table requirements_attachments(id uuid primary key, request_id uuid, verification_status text, rejection_reason text);
    create table application_logs(created_at timestamptz default clock_timestamp(), request_id uuid, performed_by_profile_id uuid, action_status text, remarks text);
    create function fail_history() returns trigger language plpgsql as $$
      begin
        if current_setting('test.fail_history', true) = 'yes'
          or (current_setting('test.fail_history', true) = 'status' and new.action_status <> 'hard_copies_validated')
          or (current_setting('test.fail_history', true) = 'release' and new.action_status = 'released') then raise exception 'History unavailable'; end if;
        return new;
      end;
    $$;
    create trigger history_failure before insert on application_logs for each row execute function fail_history();
    grant usage on schema public, auth to authenticated;
    grant select, update on requests, requirements_attachments to authenticated;
    grant insert, select on application_logs to authenticated;
  `);
  await db.exec(migration);
  await db.exec(readFileSync(new URL("../../../supabase/migrations/20261106021558_record_original_document_checks.sql", import.meta.url), "utf8"));
  await db.exec(readFileSync(new URL("../../../supabase/migrations/20261106023418_reuse_processing_original_checks.sql", import.meta.url), "utf8"));
  await db.exec(readFileSync(new URL("../../../supabase/migrations/20261106031900_staff_return_and_release_confirmations.sql", import.meta.url), "utf8"));
}, 30000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec(`
    reset role;
    set test.role = 'supervisor'; set test.fail_history = 'no';
    delete from application_logs; delete from requirements_attachments; delete from requests;
    insert into requests(id,status,claimed_by,claimed_stage,claim_expires_at,payment_status,fees_due)
      values('${request}','under_validation','${staff}','under_validation',now()+interval '15 minutes','unpaid',0);
    insert into requirements_attachments values('${attachment}','${request}','pending',null);
    set role authenticated;
  `);
});

it("saves the status and actor history together", async () => {
  await save();
  expect((await db.query("select status from requests")).rows[0]).toEqual({status:"processing"});
  expect((await db.query("select performed_by_profile_id, action_status from application_logs")).rows[0])
    .toEqual({performed_by_profile_id:staff,action_status:"processing"});
});
it("rolls back the status when history cannot be saved", async () => {
  await db.exec("set test.fail_history = 'yes'");
  await expect(save()).rejects.toThrow("History unavailable");
  expect((await db.query("select status from requests")).rows[0]).toEqual({status:"under_validation"});
});
it.each(["claim_expires_at = now()-interval '1 second'", "claimed_by = '00000000-0000-4000-8000-000000000009'"])("rejects a claim lost after the application read (%s)", async (change) => {
  await db.exec(`update requests set ${change}`);
  await expect(save()).rejects.toThrow(/claim changed or expired/);
  expect((await db.query("select * from application_logs")).rows).toHaveLength(0);
});
it("rejects a stale stage", async () => {
  await expect(save("status", {status:"processing"}, "submitted")).rejects.toThrow(/request changed/);
});
it("rolls back document decisions when history fails", async () => {
  await db.exec("set test.fail_history = 'yes'");
  await expect(save("document_review", {verification_status:"approved"}, "under_validation", "pending")).rejects.toThrow("History unavailable");
  expect((await db.query("select verification_status from requirements_attachments")).rows[0]).toEqual({verification_status:"pending"});
});
it("returns reopened documents to validation with both history entries", async () => {
  await db.exec("update requests set status='processing',claimed_stage='processing'; update requirements_attachments set verification_status='approved'");
  expect((await save("document_reverted", {}, "processing", "approved")).rows[0]).toEqual({returned:true});
  expect((await db.query("select status from requests")).rows[0]).toEqual({status:"under_validation"});
  expect((await db.query("select action_status from application_logs order by action_status")).rows)
    .toEqual([{action_status:"document_reverted"},{action_status:"under_validation"}]);
});
it("rolls back cashier clearance when its history fails", async () => {
  await db.exec("set test.role='cashier'; set test.fail_history='yes'; update requests set status='ready_for_release'");
  await expect(save("payment_verified", {fees_due:0,confirm_no_fee:true}, "ready_for_release")).rejects.toThrow("History unavailable");
  expect((await db.query("select payment_status from requests")).rows[0]).toEqual({payment_status:"unpaid"});
});
it("prevents ordinary staff from reopening a decision", async () => {
  await db.exec("set test.role='staff'; update requirements_attachments set verification_status='approved'");
  await expect(save("document_reverted", {}, "under_validation", "approved")).rejects.toThrow(/supervisor or admin/);
});



it("requires confirmation before a registration is ready", async () => {
  await db.exec("update requests set request_type='OTCOLB-MARITAL',status='processing',claimed_stage='processing'");
  await expect(save("status", {status:"ready_for_release"}, "processing")).rejects.toThrow(/checked the original documents/);
  expect((await db.query("select status from requests")).rows[0]).toEqual({status:"processing"});
});
it("records the original checker separately from the status action", async () => {
  await db.exec("update requests set request_type='OTCOLB-MARITAL',status='processing',claimed_stage='processing'");
  await save("status", {status:"ready_for_release", originals_confirmed:true}, "processing");
  expect((await db.query("select action_status,performed_by_profile_id from application_logs order by action_status")).rows)
    .toEqual([
      {action_status:"hard_copies_validated",performed_by_profile_id:staff},
      {action_status:"ready_for_release",performed_by_profile_id:staff},
    ]);
});
it("blocks direct API updates that bypass the confirmation", async () => {
  await db.exec("update requests set status='processing',claimed_stage='processing',request_type='BIRTH_ONTIME'");
  await expect(db.exec("update requests set status='ready_for_release'")).rejects.toThrow(/checked the original documents/);
});
it("requires a physical check at release even for requests already marked ready", async () => {
  await db.exec("update requests set status='ready_for_release',claimed_stage='ready_for_release',payment_status='verified'");
  await expect(save("status", {status:"released",identity_verified:true,handover_confirmed:true}, "ready_for_release")).rejects.toThrow(/checked the original documents/);
  await save("status", {status:"released",identity_verified:true,handover_confirmed:true,originals_confirmed:true}, "ready_for_release");
  expect((await db.query("select action_status from application_logs where action_status='hard_copies_validated'")).rows).toHaveLength(1);
});
it("keeps email inquiries online without an originals confirmation", async () => {
  await db.exec("update requests set request_type='EMAIL_INQUIRY',status='ready_for_release',claimed_stage='ready_for_release',payment_status='verified'");
  await save("status", {status:"released",identity_verified:true,handover_confirmed:true}, "ready_for_release");
  expect((await db.query("select action_status from application_logs")).rows).toEqual([{action_status:"identity_verified"},{action_status:"released"}]);
});
it("rolls back the physical check if the status history fails", async () => {
  await db.exec("update requests set request_type='BIRTH_ONTIME',status='processing',claimed_stage='processing'; set test.fail_history='status'");
  await expect(save("status", {status:"ready_for_release",originals_confirmed:true}, "processing")).rejects.toThrow("History unavailable");
  expect((await db.query("select status from requests")).rows[0]).toEqual({status:"processing"});
  expect((await db.query("select * from application_logs")).rows).toHaveLength(0);
});

it("reuses a registration check from Processing at release", async () => {
  await db.exec("update requests set request_type='OTCOLB-MARITAL',status='processing',claimed_stage='processing'");
  await save("status",{status:"ready_for_release",originals_confirmed:true},"processing");
  await db.exec("update requests set claimed_stage='ready_for_release',payment_status='verified'");
  await save("status",{status:"released",identity_verified:true,handover_confirmed:true},"ready_for_release");
  expect((await db.query("select * from application_logs where action_status='hard_copies_validated'")).rows).toHaveLength(1);
});
it("requires another check after the documents change", async () => {
  await db.exec("update requests set request_type='OTCOLB-MARITAL',status='processing',claimed_stage='processing'");
  await save("status",{status:"ready_for_release",originals_confirmed:true},"processing");
  await db.exec("update requests set claimed_stage='ready_for_release',payment_status='verified'");
  await db.query("insert into application_logs(request_id,action_status) values($1,'document_uploaded')",[request]);
  await expect(save("status",{status:"released",identity_verified:true,handover_confirmed:true},"ready_for_release")).rejects.toThrow(/original documents/);
});
it("still checks originals at collection for CTC even with an earlier check", async () => {
  await db.exec("update requests set status='ready_for_release',claimed_stage='ready_for_release',payment_status='verified'");
  await db.query("insert into application_logs(request_id,action_status) values($1,'hard_copies_validated')",[request]);
  await expect(save("status",{status:"released",identity_verified:true,handover_confirmed:true},"ready_for_release")).rejects.toThrow(/original documents/);
});

it.each(["", "   ", String.fromCharCode(10, 9)])("requires a reason for manual returns (%j)", async (remarks) => {
  await db.exec("update requests set status='processing',claimed_stage='processing'");
  await expect(save("status",{status:"under_validation"},"processing",null,remarks)).rejects.toThrow(/needs rechecking/);
  expect((await db.query("select status from requests")).rows[0]).toEqual({status:"processing"});
  expect((await db.query("select * from application_logs")).rows).toHaveLength(0);
});
it("saves the return reason under the acting staff member", async () => {
  await db.exec("update requests set status='processing',claimed_stage='processing'");
  await save("status",{status:"under_validation"},"processing",null,"Original certificate has a different name.");
  expect((await db.query("select action_status,remarks,performed_by_profile_id from application_logs")).rows[0])
    .toEqual({action_status:"under_validation",remarks:"Original certificate has a different name.",performed_by_profile_id:staff});
});
it("blocks direct returns that bypass the reason", async () => {
  await db.exec("update requests set status='processing',claimed_stage='processing'");
  await expect(db.exec("update requests set status='under_validation'")).rejects.toThrow(/required confirmations/);
});
it.each([
  {status:"released",originals_confirmed:true,handover_confirmed:true},
  {status:"released",originals_confirmed:true,identity_verified:false,handover_confirmed:true},
  {status:"released",originals_confirmed:true,identity_verified:"true",handover_confirmed:true},
])("rejects release without a true identity confirmation", async (values) => {
  await db.exec("update requests set status='ready_for_release',claimed_stage='ready_for_release',payment_status='verified'");
  await expect(save("status",values,"ready_for_release")).rejects.toThrow(/identity and authority/);
  expect((await db.query("select * from application_logs")).rows).toHaveLength(0);
});
it.each([undefined,false,"true"])("requires a separate true physical handover confirmation (%j)", async (handover) => {
  await db.exec("update requests set status='ready_for_release',claimed_stage='ready_for_release',payment_status='verified'");
  await expect(save("status",{status:"released",originals_confirmed:true,identity_verified:true,handover_confirmed:handover},"ready_for_release")).rejects.toThrow(/handing over/);
});
it("records identity and handover separately using the stored copy count", async () => {
  await db.exec("update requests set status='ready_for_release',claimed_stage='ready_for_release',payment_status='verified',copies=2");
  await save("status",{status:"released",originals_confirmed:true,identity_verified:true,handover_confirmed:true},"ready_for_release");
  const logs=(await db.query("select action_status,remarks,performed_by_profile_id from application_logs where action_status in ('identity_verified','handover_confirmed')")).rows;
  expect(logs).toContainEqual({action_status:"identity_verified",remarks:"Verified the claimant identity and authority to receive the document.",performed_by_profile_id:staff});
  expect(logs).toContainEqual({action_status:"handover_confirmed",remarks:"Confirmed handover of 2 copies.",performed_by_profile_id:staff});
});
it("rolls back release and its separate confirmations if history fails", async () => {
  await db.exec("update requests set status='ready_for_release',claimed_stage='ready_for_release',payment_status='verified'; set test.fail_history='release'");
  await expect(save("status",{status:"released",originals_confirmed:true,identity_verified:true,handover_confirmed:true},"ready_for_release")).rejects.toThrow("History unavailable");
  expect((await db.query("select status from requests")).rows[0]).toEqual({status:"ready_for_release"});
  expect((await db.query("select * from application_logs")).rows).toHaveLength(0);
});
it("rejects a direct release even when a registration has a recorded originals check", async () => {
  await db.exec("update requests set request_type='OTCOLB-MARITAL',status='processing',claimed_stage='processing'");
  await save("status",{status:"ready_for_release",originals_confirmed:true},"processing");
  await db.exec("update requests set claimed_stage='ready_for_release',payment_status='verified'");
  await expect(db.exec("update requests set status='released'")).rejects.toThrow(/required confirmations/);
});
it("requires identity online but no physical handover for inquiries", async () => {
  await db.exec("update requests set request_type='EMAIL_INQUIRY',status='ready_for_release',claimed_stage='ready_for_release',payment_status='verified'");
  await save("status",{status:"released",identity_verified:true},"ready_for_release");
  expect((await db.query("select action_status from application_logs")).rows)
    .toEqual([{action_status:"identity_verified"},{action_status:"released"}]);
});
