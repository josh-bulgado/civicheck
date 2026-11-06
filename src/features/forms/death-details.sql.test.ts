import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { evaluateTemplateEventTiming } from "./form-template.utils";
import { parseFormTemplateDefinition } from "./form-template.utils";

const db = new PGlite();
const migration = readFileSync(new URL("../../../supabase/migrations/20261105123233_move_on_time_death_event_fields_to_details.sql", import.meta.url),"utf8");
const date = { key:"event_date",type:"date",label:"Date of death",required:true,dateDirection:"past" };
const place = { key:"event_place",type:"text",label:"Place of death",required:true,placeholder:"Hospital, barangay, city, province" };
const definition = {
  schemaVersion:1,
  sections:[
    {key:"case",step:"case",title:"Case",fields:[date,place,{key:"additional_notes",type:"textarea",label:"Notes",required:false}]},
    {key:"details",step:"details",title:"Your details",fields:[{key:"subjects",type:"person_group",label:"Person named on the record",required:true},{key:"contact_number",type:"phone",label:"Contact number",required:false}]},
  ],
  eventTiming:{triggerField:"event_date",windowDays:30,mismatch:"outside_window",timezone:"Asia/Manila",behavior:"redirect_confirm",targetServiceCode:"DEATH_DELAYED",title:"More than 30 days ago",description:"Use delayed registration",ctaLabel:"Switch",requireDocumentFirst:false},
};
beforeAll(async()=>{
  await db.exec(`create table form_templates(id uuid primary key default gen_random_uuid(),template_key text,active_version_id uuid,updated_at timestamptz);
    create table form_template_versions(id uuid primary key default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);
    insert into form_templates(template_key) values ('death_ontime'),('death_delayed');`);
  await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$1::jsonb from form_templates",[JSON.stringify(definition)]);
  await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
  await db.exec(migration);
},30_000);
afterAll(()=>db.close());

it("moves only the on-time death event fields and keeps the date rule",async()=>{
  const {rows} = await db.query<{template_key:string; definition:typeof definition}>("select t.template_key,v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id");
  const onTime=rows.find(row=>row.template_key==='death_ontime')!.definition;
  expect(onTime.sections.filter(section=>section.step==='case').flatMap(section=>section.fields).map(field=>field.key)).toEqual(['additional_notes']);
  expect(onTime.sections.filter(section=>section.step==='details').flatMap(section=>section.fields).filter(field=>['event_date','event_place'].includes(field.key))).toEqual([date,place]);
  expect(onTime.eventTiming).toEqual(definition.eventTiming);
  expect(rows.find(row=>row.template_key==='death_delayed')!.definition).toEqual(definition);
  const parsed=parseFormTemplateDefinition(onTime);
  expect(evaluateTemplateEventTiming(parsed,{event_date:'2026-10-06'},'2026-11-05')?.evaluation.mismatched).toBe(false);
  expect(evaluateTemplateEventTiming(parsed,{event_date:'2026-10-05'},'2026-11-05')?.evaluation.mismatched).toBe(true);
});

it("does not duplicate the fields or publish again on a repeat run",async()=>{
  await db.exec(migration);
  const {rows}=await db.query<{count:number}>("select count(*)::int as count from form_template_versions v join form_templates t on t.id=v.template_id where t.template_key='death_ontime'");
  expect(rows[0].count).toBe(2);
});
