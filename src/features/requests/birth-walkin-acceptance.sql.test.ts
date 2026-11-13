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
  const courtMigration = readFileSync(new URL("../../../supabase/migrations/20261111030534_accept_checked_court_decree_walkins.sql", import.meta.url), "utf8");
  await db.exec(courtMigration);
  await db.exec(courtMigration);
  await db.exec(`insert into services_registry values('COURT-ANNULMENT','${other}'),('COURT-FOREIGN-ADOPTION','${other}')`);
  const supplementalMigration = readFileSync(new URL("../../../supabase/migrations/20261111030617_accept_checked_supplemental_walkins.sql", import.meta.url), "utf8");
  await db.exec(supplementalMigration);
  await db.exec(supplementalMigration);
  await db.exec(`insert into services_registry values('SUPPLEMENTAL_REPORT','${other}')`);
  await db.exec(`insert into services_registry values('LEGITIMATION','${other}')`);
  const petitionMigration = readFileSync(new URL("../../../supabase/migrations/20261111030938_accept_checked_petition_walkins.sql", import.meta.url), "utf8");
  await db.exec(petitionMigration);
  await db.exec(petitionMigration);
  await db.exec(`insert into services_registry values('RA9048-CFN','${other}'),('RA9048-CCE','${other}')`);
  await db.exec(`insert into services_registry values('DEATH_ONTIME','${other}'),('DEATH_DELAYED','${other}')`);
  await db.exec(`insert into services_registry values('MARRIAGE_ONTIME','${other}'),('MARRIAGE_DELAYED','${other}')`);
  const ra9255Migration = readFileSync(new URL("../../../supabase/migrations/20261111031308_accept_checked_ra9255_walkins.sql", import.meta.url), "utf8");
  await db.exec(ra9255Migration);
  await db.exec(ra9255Migration);
  const licenseMigration = readFileSync(new URL("../../../supabase/migrations/20261111094134_accept_checked_marriage_license_walkins.sql", import.meta.url), "utf8");
  await db.exec(licenseMigration);
  await db.exec(licenseMigration);
  await db.exec(`insert into services_registry values('MARRIAGE_LICENSE','${other}')`);
  const otherCertificateMigration = readFileSync(new URL("../../../supabase/migrations/20261112155102_accept_checked_other_certificate_walkins.sql", import.meta.url), "utf8");
  await db.exec(otherCertificateMigration);
  await db.exec(otherCertificateMigration);
  await db.exec(`insert into services_registry values('OTHER_CERT','${other}')`);
  await db.exec(`insert into services_registry values('RA9255_SURNAME','${other}')`);
  const endorsementMigration = readFileSync(new URL("../../../supabase/migrations/20261113010832_accept_checked_electronic_endorsement_walkins.sql", import.meta.url), "utf8");
  await db.exec(endorsementMigration);
  await db.exec(endorsementMigration);
  await db.exec(`insert into services_registry values('ELEC_ENDORSEMENT','${other}')`);
  await db.exec(`create table form_templates(id uuid primary key default gen_random_uuid(),template_key text,active_version_id uuid,updated_at timestamptz);
    create table form_template_versions(id uuid primary key default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);
    insert into form_templates(template_key) values('ra9048_10172');
    insert into form_template_versions(template_id,version,status,definition) select id,1,'published','{"schemaVersion":1,"sections":[]}'::jsonb from form_templates;
    update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id;`);
  const charterFieldsMigration = readFileSync(new URL("../../../supabase/migrations/20261113075722_petition_charter_fields_only.sql", import.meta.url), "utf8");
  await db.exec(charterFieldsMigration);
  await db.exec(charterFieldsMigration);
}, 30_000);
afterAll(() => db.close());
it.each(["RA9048-CFN", "RA9048-CCE"])("accepts checked %s filings with pending publication and immutable audit", async request_type => {
  const input = { request_type, form_template_version_id: other, form_data: {
    intake_channel: "walk_in", physical_documents_confirmed: "true",
  } };
  const result = await insert(input);
  expect(result.rows[0]).toMatchObject({ status: "processing", payment_status: "unpaid", walk_in_accepted_by: actor });
  const logs = (await db.query<{remarks: string}>("select remarks from application_logs")).rows;
  expect(logs).toHaveLength(2);
  expect(logs.every(log => log.remarks.includes("petition") && log.remarks.includes("remain pending"))).toBe(true);
  await expect(db.exec("update requests set walk_in_accepted_by=null")).rejects.toThrow(/cannot be changed/);
  await expect(db.exec("update requests set status='released'")).rejects.toThrow(/cannot move/);
});
it("rejects unconfirmed petition intake, other departments, and paid-at-creation requests", async () => {
  const input = { request_type: "RA9048-CCE", form_template_version_id: other, form_data: {
    intake_channel: "walk_in", physical_documents_confirmed: "true",
  } };
  for (const patch of [
    { form_data: { ...input.form_data, physical_documents_confirmed: "false" } },
    { form_template_version_id: null }, { payment_status: "verified" }, { walk_in_accepted_by: null },
  ]) await expect(insert({ ...input, ...patch })).rejects.toThrow();
  await db.exec("reset role; update services_registry set department_id=null where service_code='RA9048-CCE'; set role authenticated");
  await expect(insert(input)).rejects.toThrow(/department/);
  await db.exec(`reset role; update services_registry set department_id='${other}' where service_code='RA9048-CCE'; set role authenticated; set test.fail_history='yes'`);
  await expect(insert(input)).rejects.toThrow(/History unavailable/);
  expect((await db.query("select * from requests")).rows).toHaveLength(0);
});
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

it.each(["advance", "negative", "blurred"])("accepts checked %s endorsement papers with staff audit", async endorsement_type => {
  const result = await insert({ request_type: "ELEC_ENDORSEMENT", form_template_version_id: other,
    form_data: { intake_channel: "walk_in", physical_documents_confirmed: "true", endorsement_type, record_type: "birth" } });
  expect(result.rows[0]).toMatchObject({ status: "processing", payment_status: "unpaid", walk_in_accepted_by: actor });
  const logs = (await db.query<{remarks: string}>("select remarks from application_logs")).rows;
  expect(logs).toHaveLength(2);
  expect(logs.every(log => log.remarks.includes("Electronic Endorsement") && log.remarks.includes("payment remain pending"))).toBe(true);
  await expect(db.exec("update requests set walk_in_accepted_by=null")).rejects.toThrow(/cannot be changed/);
});

it("rejects unchecked endorsement papers, missing case choices, other departments, and payment at intake", async () => {
  const form_data = { intake_channel: "walk_in", physical_documents_confirmed: "true", endorsement_type: "negative", record_type: "death" };
  const input = { request_type: "ELEC_ENDORSEMENT", form_template_version_id: other, form_data };
  for (const patch of [
    { form_data: { ...form_data, physical_documents_confirmed: "false" } },
    { form_data: { ...form_data, endorsement_type: "" } }, { form_data: { ...form_data, record_type: "other" } },
    { form_template_version_id: null }, { payment_status: "verified" }, { walk_in_accepted_by: null }, { applicant_id: actor },
  ]) await expect(insert({ ...input, ...patch })).rejects.toThrow();
  await db.exec("reset role; update services_registry set department_id=null where service_code='ELEC_ENDORSEMENT'; set role authenticated");
  await expect(insert(input)).rejects.toThrow(/department/);
  await db.exec(`reset role; update services_registry set department_id='${other}' where service_code='ELEC_ENDORSEMENT'; set role authenticated; set test.fail_history='yes'`);
  await expect(insert(input)).rejects.toThrow(/History unavailable/);
  expect((await db.query("select * from requests")).rows).toHaveLength(0);
});

it("accepts Other Certificates physical papers and records staff acceptance", async () => {
  const result = await insert({ request_type: "OTHER_CERT", form_template_version_id: other,
    form_data: { intake_channel: "walk_in", physical_documents_confirmed: "true" } });
  expect(result.rows[0]).toMatchObject({ status: "processing", payment_status: "unpaid", walk_in_accepted_by: actor });
  const logs = await db.query<{ action_status: string; remarks: string }>("select action_status,remarks from application_logs order by created_at");
  expect(logs.rows.map(row => row.action_status)).toEqual(["walk_in_accepted", "processing"]);
  expect(logs.rows.every(row => row.remarks.includes("Other Certificates"))).toBe(true);
});

it("rejects unchecked or unversioned Other Certificates walk-ins", async () => {
  const input = { request_type: "OTHER_CERT", form_template_version_id: other,
    form_data: { intake_channel: "walk_in", physical_documents_confirmed: "true" } };
  for (const patch of [
    { form_data: { intake_channel: "walk_in" } }, { form_template_version_id: null },
    { walk_in_accepted_by: other }, { walk_in_accepted_by: null }, { payment_status: "verified" },
  ]) await expect(insert({ ...input, ...patch })).rejects.toThrow();
});

it("accepts Marriage License filing papers and appearance without completing later steps", async () => {
  const result = await insert({ request_type: "MARRIAGE_LICENSE", form_template_version_id: other,
    form_data: { intake_channel: "walk_in", physical_documents_confirmed: "true", couple_appearance_confirmed: "true" } });
  expect(result.rows[0]).toMatchObject({ status: "processing", payment_status: "unpaid", walk_in_accepted_by: actor });
  const logs = (await db.query<{ remarks: string }>("select remarks from application_logs")).rows;
  expect(logs).toHaveLength(2);
  expect(logs.every(log => log.remarks.includes("marriage-license application") && log.remarks.includes("remain pending"))).toBe(true);
  await expect(db.exec("update requests set walk_in_accepted_by=null")).rejects.toThrow(/cannot be changed/);
  await expect(db.exec("update requests set payment_status='verified'")).rejects.toThrow(/Only the cashier/);
});

it("rejects unchecked Marriage License papers, missing appearance, wrong departments, and paid intake", async () => {
  const input = { request_type: "MARRIAGE_LICENSE", form_template_version_id: other,
    form_data: { intake_channel: "walk_in", physical_documents_confirmed: "true", couple_appearance_confirmed: "true" } };
  for (const patch of [
    { form_data: { ...input.form_data, physical_documents_confirmed: "false" } },
    { form_data: { ...input.form_data, couple_appearance_confirmed: "false" } },
    { form_template_version_id: null }, { walk_in_accepted_by: other }, { payment_status: "verified" },
  ]) await expect(insert({ ...input, ...patch })).rejects.toThrow();
  await db.exec("reset role; update services_registry set department_id=null where service_code='MARRIAGE_LICENSE'; set role authenticated");
  await expect(insert(input)).rejects.toThrow(/department/);
  await db.exec(`reset role; update services_registry set department_id='${other}' where service_code='MARRIAGE_LICENSE'; set role authenticated; set test.fail_history='yes'`);
  await expect(insert(input)).rejects.toThrow(/History unavailable/);
  expect((await db.query("select id from requests")).rows).toHaveLength(0);
});

it("records staff acceptance, time, and processing history together", async () => {
  const result = await insert({walk_in_accepted_at: "1900-01-01"});
  expect(result.rows[0]).toMatchObject({status: "processing",payment_status: "unpaid",walk_in_accepted_by: actor});
  expect(String(result.rows[0].walk_in_accepted_at)).not.toContain("1900");
  expect((await db.query("select performed_by_profile_id,action_status from application_logs order by created_at")).rows)
    .toEqual([{performed_by_profile_id: actor,action_status: "walk_in_accepted"},{performed_by_profile_id: actor,action_status: "processing"}]);
});
it.each(["yes", "no"])("accepts checked R.A. 9255 with acknowledgment %s and appearance history", async father_on_record => {
  const result = await insert({ request_type: "RA9255_SURNAME", form_data: {
    intake_channel: "walk_in", father_on_record, personal_appearance_confirmed: "true",
  } });
  expect(result.rows[0]).toMatchObject({ status: "processing", payment_status: "unpaid", walk_in_accepted_by: actor });
  const logs = (await db.query<{ action_status: string; remarks: string }>("select action_status,remarks from application_logs order by created_at")).rows;
  expect(logs.map(log => log.action_status)).toEqual(["walk_in_accepted", "processing"]);
  expect(logs.every(log => log.remarks.includes("R.A. 9255") && log.remarks.includes("personal appearance"))).toBe(true);
  await expect(db.exec("update requests set walk_in_accepted_by=null")).rejects.toThrow(/cannot be changed/);
  await expect(db.exec("update requests set payment_status='verified'")).rejects.toThrow(/Only the cashier/);
  await expect(db.exec("update requests set status='released'")).rejects.toThrow(/cannot move/);
});
it("rejects uncertain acknowledgment or missing appearance for direct R.A. 9255 inserts", async () => {
  for (const father_on_record of [undefined, "", "not_sure", "other"]) {
    await expect(insert({ request_type: "RA9255_SURNAME", form_data: {
      intake_channel: "walk_in", father_on_record, personal_appearance_confirmed: "true",
    } })).rejects.toThrow(/acknowledgment/);
  }
  for (const personal_appearance_confirmed of [undefined, false, "false"]) {
    await expect(insert({ request_type: "RA9255_SURNAME", form_data: {
      intake_channel: "walk_in", father_on_record: "yes", personal_appearance_confirmed,
    } })).rejects.toThrow(/personal appearance/);
  }
  expect((await db.query("select * from requests")).rows).toHaveLength(0);
});
it("protects R.A. 9255 department, staff identity, payment, and atomic audit history", async () => {
  const input = { request_type: "RA9255_SURNAME", form_data: {
    intake_channel: "walk_in", father_on_record: "no", personal_appearance_confirmed: "true",
  } };
  for (const patch of [
    { walk_in_accepted_by: other }, { walk_in_accepted_by: null }, { applicant_id: actor },
    { payment_status: "verified" }, { or_number: "fake" }, { status: "ready_for_release" },
  ]) await expect(insert({ ...input, ...patch })).rejects.toThrow();
  await db.exec("set test.role='applicant'");
  await expect(insert(input)).rejects.toThrow(/Only staff/);
  await db.exec("reset role; set test.role='staff'; update services_registry set department_id=null where service_code='RA9255_SURNAME'; set role authenticated");
  await expect(insert(input)).rejects.toThrow(/department/);
  await db.exec(`reset role; update services_registry set department_id='${other}' where service_code='RA9255_SURNAME'; set role authenticated; set test.fail_history='yes'`);
  await expect(insert(input)).rejects.toThrow("History unavailable");
  expect((await db.query("select * from requests")).rows).toHaveLength(0);
  expect((await db.query("select * from application_logs")).rows).toHaveLength(0);
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

it("accepts supplemental papers only with personal appearance and records history", async () => {
  const form_data = { intake_channel: "walk_in", personal_appearance_confirmed: "true" };
  const result = await insert({ request_type: "SUPPLEMENTAL_REPORT", form_data });
  expect(result.rows[0]).toMatchObject({ status: "processing", payment_status: "unpaid", walk_in_accepted_by: actor });
  const logs = await db.query<{ remarks: string }>("select remarks from application_logs order by created_at");
  expect(logs.rows).toHaveLength(2);
  expect(logs.rows.every(row => row.remarks.includes("Supplemental Report"))).toBe(true);
});
it.each([undefined, "false"])("rejects supplemental intake without appearance (%s)", async value => {
  await expect(insert({ request_type: "SUPPLEMENTAL_REPORT", form_data: { intake_channel: "walk_in", personal_appearance_confirmed: value } })).rejects.toThrow(/personal appearance/);
});
it("rejects supplemental acceptance from another department", async () => {
  await db.exec(`reset role; update services_registry set department_id='${actor}' where service_code='SUPPLEMENTAL_REPORT'; set role authenticated`);
  try {
    await expect(insert({ request_type: "SUPPLEMENTAL_REPORT", form_data: { intake_channel: "walk_in", personal_appearance_confirmed: "true" } })).rejects.toThrow(/department/);
  } finally {
    await db.exec(`reset role; update services_registry set department_id='${other}' where service_code='SUPPLEMENTAL_REPORT'; set role authenticated`);
  }
});

it.each(["COURT-ANNULMENT", "COURT-FOREIGN-ADOPTION"])("accepts checked %s court papers and audits the staff member", async request_type => {
  const result=await insert({request_type,form_data:{intake_channel:"walk_in",issued_by_rtc_legazpi:"no"}});
  expect(result.rows[0]).toMatchObject({status:"processing",payment_status:"unpaid",walk_in_accepted_by:actor});
  expect((await db.query("select remarks from application_logs order by created_at")).rows)
    .toEqual([{remarks:expect.stringContaining("Checked four copies")},{remarks:expect.stringContaining("Accepted walk-in court-decree")}]);
});
it.each(["", "not_sure"])("refuses unchecked court location (%s)", async answer => {
  await expect(insert({request_type:"COURT-ANNULMENT",form_data:{intake_channel:"walk_in",issued_by_rtc_legazpi:answer}}))
    .rejects.toThrow(/Check whether RTC Legazpi/);
});
it("rolls back court intake when its history cannot be recorded", async () => {
  await db.exec("set test.fail_history='yes'");
  await expect(insert({request_type:"COURT-ANNULMENT",form_data:{intake_channel:"walk_in",issued_by_rtc_legazpi:"yes"}})).rejects.toThrow("History unavailable");
  expect((await db.query("select id from requests")).rows).toHaveLength(0);
});
