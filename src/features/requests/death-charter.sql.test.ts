import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { parseFormTemplateDefinition, validateTemplateAnswers } from "../forms/form-template.utils";
import type { FormTemplateDefinition } from "../forms/form-template.types";

const db = new PGlite();
const sql = (name: string) => readFileSync(new URL(`../../../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
const migration = sql("20261110122927_death_charter_flow_fixes");
const request = "00000000-0000-4000-8000-000000000002";
let definition: FormTemplateDefinition;

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql as $$ select '${request}'::uuid $$;
    create function get_user_role() returns text language sql as $$ select current_setting('test.role',true) $$;
    create table requests(id uuid primary key,tracking_number text,applicant_id uuid,request_type text,status text,
      payment_status text,or_number text,fees_due numeric,copies int,form_data jsonb,form_template_version_id uuid,
      created_at timestamptz default now(),updated_at timestamptz,claimed_by uuid,claimed_stage text,claimed_at timestamptz,
      claim_expires_at timestamptz,posting_start_date date,posting_end_date date);
    create table requirements_attachments(id uuid,request_id uuid,verification_status text,rejection_reason text);
    create table application_logs(request_id uuid,performed_by_profile_id uuid,action_status text,remarks text);
    create table form_templates(id uuid primary key,template_key text,active_version_id uuid,updated_at timestamptz);
    create table form_template_versions(id uuid default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);
    create table service_requirements_metadata(service_code text,requirement_name text,applies_when jsonb,is_mandatory boolean);
    create function needs_original_document_check(text,text) returns boolean language sql as $$select false$$;
    create function has_current_original_document_check(uuid) returns boolean language sql as $$select false$$;
    grant usage on schema public,auth to authenticated;
    grant select,update on requests,requirements_attachments to authenticated;
    grant select,insert on application_logs to authenticated;
  `);
  const extract = (file: string, name: string) => {
    const text = sql(file);
    const start = text.indexOf(`create or replace function public.${name}(`);
    if (start < 0) throw new Error(`Missing function ${name}`);
    return text.slice(start, text.indexOf("$$;", start) + 3);
  };
  await db.exec(extract("20261106031900_staff_return_and_release_confirmations", "save_staff_request_action"));
  await db.exec(extract("20261027120000_security_hardening", "guard_request_workflow"));
  await db.exec(extract("20261010121000_add_staff_notification_triggers", "trg_notify_request_payment_verified"));
  const conversion = sql("20261105172914_automatically_convert_expired_registrations");
  const start = conversion.indexOf("create function public.convert_expired_registrations(");
  await db.exec(conversion.slice(start, conversion.indexOf("$$;", start) + 3));
  await db.exec("create trigger workflow before update on requests for each row execute function guard_request_workflow()");
  await db.exec(sql("20261103145806_marriage_posting_period"));
  await db.exec(sql("20261104151348_extend_posting_to_death_and_license"));
  const original = { schemaVersion: 1, sections: [{ key: "case", step: "case", title: "Case details", fields: [
    { key: "event_date", type: "date", label: "Date of death", required: true },
  ] }, { key: "details", step: "details", title: "Details", fields: [
    { key: "subjects", type: "person_group", label: "Deceased", required: false },
  ] }], eventTiming: { triggerField: "event_date", windowDays: 30, mismatch: "inside_window",
    behavior: "redirect_confirm", targetServiceCode: "DEATH_ONTIME", title: "Within 30 days", description: "Use on-time" } };
  await db.query("insert into form_templates(id,template_key) values ($1,'death_delayed')", [request]);
  await db.query("insert into form_template_versions(template_id,version,status,definition) values ($1,1,'published',$2)", [request, JSON.stringify(original)]);
  await db.exec(`update form_templates set active_version_id=(select id from form_template_versions);
    insert into service_requirements_metadata values ('DEATH_DELAYED','Burial Certificate','{"field":"disposal_method","operator":"equals","value":"buried"}',true);`);
  await db.exec(migration);
  await db.exec(sql("20261110131624_death_burial_certificate_condition"));
  const { rows } = await db.query<{ definition: unknown }>("select definition from form_template_versions where version=2");
  definition = parseFormTemplateDefinition(rows[0].definition);
}, 30000);
afterAll(() => db.close());

it("allows a recent death only under the no-existing-record basis", () => {
  const answers = { event_date: "2026-11-01", death_registration_basis: "no_existing_record" };
  expect(validateTemplateAnswers(definition, answers, "2026-11-10").success).toBe(true);
  expect(validateTemplateAnswers(definition, { ...answers, death_registration_basis: "beyond_30_days" }, "2026-11-10").success).toBe(false);
  expect(validateTemplateAnswers(definition, { event_date: "2026-11-01" }, "2026-11-10").success).toBe(false);
  expect(validateTemplateAnswers(definition, { ...answers, death_registration_basis: "beyond_30_days", event_date: "2026-10-01" }, "2026-11-10").success).toBe(true);
});
it("limits the burial certificate to buried remains and preserves the old template", async () => {
  expect((await db.query("select applies_when,is_mandatory from service_requirements_metadata")).rows[0]).toEqual({
    applies_when: { match: "all", conditions: [{ field: "disposal_method", operator: "equals", value: "buried" }] },
    is_mandatory: true,
  });
  expect((await db.query("select count(*)::int as count from form_template_versions")).rows[0]).toEqual({ count: 2 });
});
it("accepts cashier payment during posting, keeps the receipt and audit, and blocks release", async () => {
  await db.exec(`insert into requests(id,request_type,status,payment_status,fees_due) values ('${request}','DEATH_DELAYED','processing','unpaid',620);
    set test.role='staff'; set role authenticated;
    update requests set posting_start_date=(now() at time zone 'Asia/Manila')::date where id='${request}';
    set test.role='cashier';`);
  await expect(db.query("select save_staff_request_action($1,'processing','payment_verified',$2,'Paid')", [request, JSON.stringify({ fees_due: 620 })])).rejects.toThrow(/Confirm the payment/);
  await db.exec("set test.role='staff'");
  await expect(db.query("select save_staff_request_action($1,'processing','payment_verified',$2,'Paid')", [request, JSON.stringify({ fees_due: 620, or_number: "OR-123" })])).rejects.toThrow(/Only the cashier/);
  await db.exec("set test.role='cashier'");
  await db.query("select save_staff_request_action($1,'processing','payment_verified',$2,'Paid')", [request, JSON.stringify({ fees_due: 620, or_number: "OR-123" })]);
  expect((await db.query("select status,payment_status,or_number from requests")).rows[0]).toEqual({ status: "processing", payment_status: "verified", or_number: "OR-123" });
  expect((await db.query("select action_status from application_logs")).rows[0]).toEqual({ action_status: "payment_verified" });
  await expect(db.query("select save_staff_request_action($1,'processing','payment_verified',$2,'Paid')", [request, JSON.stringify({ fees_due: 620, or_number: "OR-456" })])).rejects.toThrow(/request changed/);
  await db.exec("set test.role='staff'");
  await expect(db.exec("update requests set status='ready_for_release'")).rejects.toThrow(/10-calendar-day/);
  await db.exec("reset role");
});
it.each(["DEATH_ONTIME", "MARRIAGE_DELAYED", "DEATH_DELAYED"])("refuses processing payment without eligibility for %s", async (service) => {
  await db.exec("reset role; delete from requests; delete from application_logs");
  await db.query("insert into requests(id,request_type,status,payment_status,fees_due) values ($1,$2,'processing','unpaid',620)", [request, service]);
  await db.exec("set test.role='cashier'; set role authenticated");
  await expect(db.query("select save_staff_request_action($1,'processing','payment_verified',$2,'Paid')", [request, JSON.stringify({ fees_due: 620, or_number: "OR-123" })])).rejects.toThrow(/request changed/);
  await expect(db.exec("update requests set payment_status='verified',or_number='OR-123'")).rejects.toThrow(/Only the cashier/);
  await db.exec("reset role");
});
