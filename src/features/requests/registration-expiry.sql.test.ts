import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const db=new PGlite();
const applicant="00000000-0000-4000-8000-000000000001";
const migration=readFileSync(new URL("../../../supabase/migrations/20261105172914_automatically_convert_expired_registrations.sql",import.meta.url),"utf8");
beforeAll(async()=>{
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,email text);
    insert into auth.users values ('${applicant}','test@example.com');
    create table requests(id uuid primary key default gen_random_uuid(),applicant_id uuid,request_type text,
      form_data jsonb,status text,payment_status text default 'unpaid',tracking_number text default 'TEST',
      hard_copies_validated_at timestamptz,form_template_version_id uuid,fees_due numeric default 0,copies integer default 1,
      posting_start_date date,posting_end_date date,claimed_by uuid,claimed_stage text,claimed_at timestamptz,
      claim_expires_at timestamptz,updated_at timestamptz default now(),created_at timestamptz default now());
    create table services_registry(service_code text primary key,fee numeric,fee_per_copy boolean default false);
    insert into services_registry(service_code,fee) values ('DEATH_DELAYED',620),('MARRIAGE_DELAYED',500),
      ('DCOLB-0079-NORMAL-MARITAL',500),('DCOLB-0079-NORMAL-NONMARITAL',800),
      ('DCOLB-80UP-NORMAL-MARITAL',500),('DCOLB-80UP-NORMAL-NONMARITAL',800);
    create table form_templates(id uuid primary key default gen_random_uuid(),active_version_id uuid default gen_random_uuid());
    create table form_template_versions(id uuid primary key,status text);
    create table service_form_templates(service_code text,template_id uuid);
    insert into form_templates select gen_random_uuid(),gen_random_uuid() from services_registry;
    insert into form_template_versions select active_version_id,'published' from form_templates;
    insert into service_form_templates select service_code,id from (
      select service_code,row_number() over(order by service_code) as rn from services_registry
    ) s join (select id,row_number() over(order by id) as rn from form_templates) t using(rn);
    create table application_logs(request_id uuid,action_status text,remarks text,performed_by_profile_id uuid);
    create table notifications(id uuid primary key default gen_random_uuid(),request_id uuid,recipient_email text,
      type text,subject text,body text,status text);
    create table requirements_attachments(id uuid primary key default gen_random_uuid(),request_id uuid,file_url text,
      verification_status text,rejection_reason text);
    create table registration_reminders(request_id uuid,notification_id uuid,deadline date,days_left integer);
    create schema cron;
    create table cron.jobs(name text,schedule text,command text);
    create function cron.schedule(text,text,text) returns bigint language sql as $$
      insert into cron.jobs values ($1,$2,$3) returning 1::bigint;
    $$;
  `);
  const dateSql=readFileSync(new URL("../../../supabase/migrations/20260828120000_add_service_report_function.sql",import.meta.url),"utf8");
  await db.exec(dateSql.slice(dateSql.indexOf("create or replace function public.civicheck_safe_date"),dateSql.indexOf("comment on function")));
  const reminderSql=readFileSync(new URL("../../../supabase/migrations/20261105114553_registration_deadline_reminders.sql",import.meta.url),"utf8");
  await db.exec(reminderSql.slice(reminderSql.indexOf("create function public.registration_deadline"),reminderSql.indexOf("alter table public.notifications")));
  await db.exec(migration.replace("create extension if not exists pg_cron;",""));
},30_000);
afterAll(()=>db.close());
beforeEach(async()=>{
  await db.exec("truncate requests,registration_delay_notices,notifications,requirements_attachments,application_logs,registration_reminders cascade");
});
async function seed(code="DEATH_ONTIME",remaining=-1,status="submitted",basis="with_license"){
  const days=code==='MARRIAGE_ONTIME'&&basis==='with_license'?15:30;
  const {rows}=await db.query<{id:string}>(`insert into requests(applicant_id,request_type,form_data,status)
    values($1,$2,jsonb_build_object('event_date',to_char((now() at time zone 'Asia/Manila')::date-$3::int,'YYYY-MM-DD'),
      'marriage_license_basis',$4::text),$5) returning id`,[applicant,code,days-remaining,basis,status]);
  return rows[0].id;
}
async function convert(){return (await db.query<{count:number}>("select public.convert_expired_registrations() as count")).rows[0].count;}

describe("automatic delayed registration",()=>{
  it.each([
    ['DEATH_ONTIME','DEATH_DELAYED',620],['MARRIAGE_ONTIME','MARRIAGE_DELAYED',500],
    ['OTCOLB-MARITAL','DCOLB-0079-NORMAL-MARITAL',500],['OTCOLB-NONMARITAL','DCOLB-0079-NORMAL-NONMARITAL',800],
  ])("converts %s to %s with the delayed fee",async(source,target,fee)=>{
    const id=await seed(source);
    await db.query("insert into requirements_attachments(request_id,file_url,verification_status) values($1,'kept.pdf','approved')",[id]);
    expect(await convert()).toBe(1);
    const {rows}=await db.query<{request_type:string;status:string;fees_due:string;tracking_number:string;form_template_version_id:string;form_data:Record<string,string>}>("select * from requests");
    expect(rows[0].request_type).toBe(target);
    expect(rows[0].status).toBe('incomplete');
    expect(Number(rows[0].fees_due)).toBe(fee);
    expect(rows[0].tracking_number).toBe('TEST');
    expect(rows[0].form_template_version_id).toBeTruthy();
    expect(rows[0].form_data.registration_type).toBe('delayed');
    const files=await db.query<{file_url:string;verification_status:string}>("select * from requirements_attachments");
    expect(files.rows[0]).toMatchObject({file_url:'kept.pdf',verification_status:'pending'});
  });
  it.each(['with_license','article_34','pd_1083'])("keeps the final marriage day inclusive for %s",async(basis)=>{
    await seed('MARRIAGE_ONTIME',0,'processing',basis);
    expect(await convert()).toBe(0);
    await seed('MARRIAGE_ONTIME',-1,'processing',basis);
    expect(await convert()).toBe(1);
  });
  it.each(['submitted','under_validation','incomplete','processing'])("converts an unfinished %s request",async(status)=>{
    await seed('DEATH_ONTIME',-1,status);
    expect(await convert()).toBe(1);
  });
  it.each(['ready_for_release','released','rejected','cancelled'])("leaves %s unchanged",async(status)=>{
    await seed('DEATH_ONTIME',-1,status);
    expect(await convert()).toBe(0);
  });
  it("does not convert a request previously ready for release",async()=>{
    const id=await seed();
    await db.query("insert into application_logs(request_id,action_status) values($1,'ready_for_release')",[id]);
    expect(await convert()).toBe(0);
  });
  it("does not convert an on-time death on the last day",async()=>{
    await seed('DEATH_ONTIME',0);
    expect(await convert()).toBe(0);
  });
  it("skips invalid dates and walk-ins",async()=>{
    await seed();
    await db.exec("update requests set form_data='{\"event_date\":\"2026-02-31\"}'");
    expect(await convert()).toBe(0);
    await seed();
    await db.exec("update requests set applicant_id=null");
    expect(await convert()).toBe(0);
  });
  it("does not convert twice or duplicate notifications",async()=>{
    await seed();
    expect(await convert()).toBe(1);
    expect(await convert()).toBe(0);
    expect((await db.query("select * from notifications")).rows).toHaveLength(1);
    expect((await db.query("select * from application_logs")).rows).toHaveLength(1);
  });
  it("releases stale staff claims and posting dates",async()=>{
    await seed('DEATH_ONTIME',-1,'processing');
    await db.query("update requests set claimed_by=$1,claimed_stage='processing',claim_expires_at=now()+interval '1 hour',posting_start_date=current_date,posting_end_date=current_date+10",[applicant]);
    await convert();
    const {rows}=await db.query<{claimed_by:null;posting_start_date:null}>("select claimed_by,posting_start_date from requests");
    expect(rows[0]).toEqual({claimed_by:null,posting_start_date:null});
  });
  it("protects the worker and conversion metadata from applicants",async()=>{
    expect((await db.query<{allowed:boolean}>("select has_function_privilege('authenticated','public.convert_expired_registrations(uuid)','execute') as allowed")).rows[0].allowed).toBe(false);
    await seed();
    await db.exec("grant update on requests to authenticated; set role authenticated");
    try {await expect(db.exec("update requests set registration_conversion='{}'")).rejects.toThrow(/managed automatically/);}
    finally {await db.exec('reset role');}
  });
  it("queues one conversion email and skips completed requests",async()=>{
    await seed();await convert();
    const {rows}=await db.query<{notification_id:string;body:string}>("select * from public.claim_registration_delay_emails()");
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toContain('automatically changed to delayed registration');
    expect((await db.query("select * from public.claim_registration_delay_emails()")).rows).toHaveLength(0);
    await db.exec("update requests set status='ready_for_release'");
    expect((await db.query<{eligible:boolean}>("select public.registration_reminder_deliverable($1) as eligible",[rows[0].notification_id])).rows[0].eligible).toBe(false);
  });
});
