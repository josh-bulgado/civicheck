import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const db = new PGlite();
const applicant = "00000000-0000-4000-8000-000000000001";
const staff = "00000000-0000-4000-8000-000000000002";
const request = "00000000-0000-4000-8000-000000000003";
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create schema vault;
    create table vault.decrypted_secrets(name text,decrypted_secret text);
    insert into vault.decrypted_secrets values ('registration_reminder_url','https://test.invalid/reminders'),('registration_reminder_secret','test-secret');
    create schema net;
    create table net.calls(id bigserial primary key,body jsonb);
    create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language plpgsql as $$
      declare call_id bigint;
      begin
        if current_setting('test.fail_http',true)='yes' then raise exception 'Test sender unavailable'; end if;
        insert into net.calls(body) values (body) returning id into call_id;
        return call_id;
      end;
    $$;
    create function auth.uid() returns uuid language sql as $$ select '${staff}'::uuid $$;
    create function public.get_user_role() returns text language sql as $$ select coalesce(nullif(current_setting('test.role',true),''),'staff') $$;
    create function public.get_user_department_id() returns text language sql as $$ select coalesce(nullif(current_setting('test.department',true),''),'birth') $$;
    create function public.is_active_user() returns boolean language sql as $$ select true $$;
    create table auth.users(id uuid primary key, email text);
    insert into auth.users values ('${applicant}','test@example.com');
    create table public.profiles(id uuid primary key);
    insert into public.profiles values ('${staff}');
    create table public.services_registry(service_code text,department_id text);
    insert into public.services_registry values ('BIRTH_ONTIME','birth'),('MARRIAGE_ONTIME','birth'),('DEATH_ONTIME','birth');
    create table public.requests(id uuid primary key,applicant_id uuid, request_type text,status text,tracking_number text,form_data jsonb);
    create table public.application_logs(request_id uuid,action_status text,remarks text,performed_by_profile_id uuid);
    create table public.notifications(id uuid primary key default gen_random_uuid(),request_id uuid,recipient_email text,type text,subject text,body text,status text,sent_at timestamptz default now(),
      constraint notifications_type_check check(type in ('status_change','message')));
  `);
  const dateMigration = readFileSync(new URL("../../../supabase/migrations/20260828120000_add_service_report_function.sql", import.meta.url),"utf8");
  await db.exec(dateMigration.slice(dateMigration.indexOf("create or replace function public.civicheck_safe_date"), dateMigration.indexOf("comment on function")));
  await db.exec(readFileSync(new URL("../../../supabase/migrations/20261105114553_registration_deadline_reminders.sql", import.meta.url),"utf8"));
  await db.exec(readFileSync(new URL("../../../supabase/migrations/20261105115942_limit_registration_reminder_batches.sql", import.meta.url),"utf8"));
  await db.exec(readFileSync(new URL("../../../supabase/migrations/20261105121044_stop_office_reminders_at_ready_for_release.sql", import.meta.url),"utf8"));
  await db.exec(readFileSync(new URL("../../../supabase/migrations/20261105130243_immediate_registration_reminders.sql", import.meta.url),"utf8"));
},30_000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec(`delete from net.calls; select set_config('test.fail_http','no',false);
    delete from public.application_logs; delete from public.registration_reminders; delete from public.notifications; delete from public.requests;
    select set_config('test.role','staff',false),set_config('test.department','birth',false);`);
});

async function seed(code = "BIRTH_ONTIME", remaining = 3, status = "processing", basis = "with_license") {
  const period = code === "MARRIAGE_ONTIME" && basis === "with_license" ? 15 : 30;
  await db.query(`insert into requests values ($1,$2,$3,$4,'TEST',jsonb_build_object('event_date',to_char((now() at time zone 'Asia/Manila')::date-$5::int,'YYYY-MM-DD'),'marriage_license_basis',$6::text),null,null)`,
    [request,applicant,code,status,period-remaining,basis]);
}
const claim = () => db.query<{ notification_id: string; subject: string; body: string }>("select * from public.claim_registration_reminders()");

describe("scheduled registration reminders", () => {
  it.each([
    ['BIRTH_ONTIME',3,'with_license'], ['OTCOLB-MARITAL',1,'with_license'],
    ['OTCOLB-NONMARITAL',3,'with_license'], ['DEATH_ONTIME',1,'with_license'],
    ['MARRIAGE_ONTIME',3,'with_license'], ['MARRIAGE_ONTIME',1,'article_34'],
    ['MARRIAGE_ONTIME',1,'pd_1083'],
  ])("immediately queues a submission for %s with %i days left (%s)",async(code,days,basis)=>{
    await seed(code,days,'submitted',basis);
    const {rows}=await db.query<{body:{request_id:string}}>('select body from net.calls');
    expect(rows).toHaveLength(1);
    expect(rows[0].body.request_id).toBe(request);
  });
  it.each([0,2,4,-1])("does not immediately queue at %i days left",async(days)=>{
    await seed('DEATH_ONTIME',days,'submitted');
    expect((await db.query('select * from net.calls')).rows).toHaveLength(0);
  });
  it("does not reject a submission if immediate delivery cannot be queued",async()=>{
    await db.exec("select set_config('test.fail_http','yes',false)");
    await seed('DEATH_ONTIME',1,'submitted');
    expect((await claim()).rows).toHaveLength(1);
  });
  it("processes the new request independently of other queued reminders",async()=>{
    await seed();
    await db.exec("insert into requests select gen_random_uuid(),applicant_id,request_type,status,tracking_number,form_data,null,null from requests");
    const immediate=await db.query<{notification_id:string}>("select * from public.claim_registration_reminders($1)",[request]);
    expect(immediate.rows).toHaveLength(1);
    const {rows}=await db.query<{request_id:string}>("select request_id from registration_reminders");
    expect(rows.map(row=>row.request_id)).toEqual([request]);
    expect((await claim()).rows).toHaveLength(1);
  });
  it("limits email batches without losing the next batch",async()=>{
    await seed();
    await db.exec(`insert into requests select gen_random_uuid(),applicant_id,request_type,status,tracking_number,form_data,null,null from requests cross join generate_series(1,10)`);
    expect((await claim()).rows).toHaveLength(10);
    expect((await claim()).rows).toHaveLength(1);
    expect((await claim()).rows).toHaveLength(0);
    expect((await db.query("select * from notifications")).rows).toHaveLength(11);
  });
  it.each(["DEATH_ONTIME","OTCOLB-MARITAL","OTCOLB-NONMARITAL"])("sends the final reminder for %s",async(code)=>{
    await seed(code,1);
    expect((await claim()).rows[0].subject).toContain("1 day left");
  });
  it.each(["submitted","under_validation","incomplete","processing"])("reminds an applicant in %s once",async(status)=>{
    await seed("BIRTH_ONTIME",3,status);
    const {rows} = await claim();
    expect(rows).toHaveLength(1);
    expect(rows[0].subject).toContain("3 days left");
    expect(rows[0].body).toContain("Submitting online does not complete registration");
    expect((await claim()).rows).toHaveLength(0);
    expect((await db.query("select * from notifications")).rows).toHaveLength(1);
  });
  it.each([0,2,4,-1])("does not remind with %i days left",async(days)=>{
    await seed("DEATH_ONTIME",days);
    expect((await claim()).rows).toHaveLength(0);
  });
  it.each(["with_license","article_34","pd_1083"])("uses the correct marriage window for %s",async(basis)=>{
    await seed("MARRIAGE_ONTIME",1,"processing",basis);
    expect((await claim()).rows[0].subject).toContain("1 day left");
  });
  it.each(["ready_for_release","released","rejected","cancelled"])("skips requests that no longer need an office reminder (%s)",async(status)=>{
    await seed("DEATH_ONTIME",1,status);
    expect((await claim()).rows).toHaveLength(0);
  });
  it("stops reminders when staff mark the request ready for release",async()=>{
    await seed();
    await db.exec("update requests set status='ready_for_release'");
    expect((await claim()).rows).toHaveLength(0);
  });
  it("keeps reminders stopped if a ready request returns to validation",async()=>{
    await seed();
    await db.query("insert into application_logs(request_id,action_status) values ($1,'ready_for_release')",[request]);
    await db.exec("update requests set status='under_validation'");
    expect((await claim()).rows).toHaveLength(0);
  });
  it("cancels a claimed email if staff mark the request ready before sending",async()=>{
    await seed();
    const {rows} = await claim();
    const id=rows[0].notification_id;
    expect((await db.query<{eligible:boolean}>("select public.registration_reminder_deliverable($1) as eligible",[id])).rows[0].eligible).toBe(true);
    await db.exec("update requests set status='ready_for_release'");
    expect((await db.query<{eligible:boolean}>("select public.registration_reminder_deliverable($1) as eligible",[id])).rows[0].eligible).toBe(false);
  });
  it("removes the redundant hard-copy action",async()=>{
    expect((await db.query<{name:string|null}>("select to_regprocedure('public.confirm_request_hard_copies(uuid)')::text as name")).rows[0].name).toBeNull();
  });
  it("skips walk-ins and invalid event dates",async()=>{
    await seed();
    await db.exec("update requests set applicant_id=null");
    expect((await claim()).rows).toHaveLength(0);
    await db.query("update requests set applicant_id=$1,form_data='{\"event_date\":\"2026-02-31\"}'",[applicant]);
    expect((await claim()).rows).toHaveLength(0);
  });
  it("retries a failed email after its lease without duplicating the notification",async()=>{
    await seed();
    await claim();
    await db.exec("update notifications set status='failed'; update registration_reminders set claimed_at=now()-interval '16 minutes'");
    expect((await claim()).rows).toHaveLength(1);
    expect((await db.query("select * from notifications")).rows).toHaveLength(1);
    await db.exec("update notifications set status='sent'; update registration_reminders set claimed_at=now()-interval '16 minutes'");
    expect((await claim()).rows).toHaveLength(0);
  });
});
