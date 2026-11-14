import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, expect, it } from "vitest";
import fixture from "./fixtures/ra9255-charter.json";
import { fieldsForStep, parseFormTemplateDefinition, validateTemplateAnswers } from "./form-template.utils";
import { isRequirementApplicable, totalFee } from "../services/service-utils";
import { feeComponentsIssue, parseFeeComponents, splitFeeComponents } from "../services/fee-components";
import type { ServiceRequirement } from "../admin/services/services.types";

const db = new PGlite();
const migration = readFileSync(new URL("../../../supabase/migrations/20261111021449_ra9255_charter_configuration.sql", import.meta.url), "utf8");
afterAll(() => db.close());

it("aligns R.A. 9255 fees and sources, blocks unresolved acknowledgment, and preserves form history", async () => {
  await db.exec(`
    create table services_registry(service_code text primary key, fee numeric, fee_components jsonb, steps_description text[]);
    create table form_templates(id uuid primary key default gen_random_uuid(), active_version_id uuid, updated_at timestamptz);
    create table form_template_versions(id uuid primary key default gen_random_uuid(), template_id uuid, version int, status text, definition jsonb, published_at timestamptz);
    create table service_form_templates(service_code text, template_id uuid);
    create table service_requirements_metadata(id uuid default gen_random_uuid(), service_code text, requirement_name text, is_mandatory boolean, requires_upload boolean, applies_when jsonb, where_to_secure text);
    insert into services_registry values ('RA9255_SURNAME',455,'[]','{}'), ('UNRELATED',999,'[]','{}');
    insert into form_templates default values;
    insert into service_form_templates select 'RA9255_SURNAME',id from form_templates;
  `);
  await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$1::jsonb from form_templates", [JSON.stringify(fixture.definition)]);
  await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
  for (const r of fixture.requirements) {
    await db.query("insert into service_requirements_metadata(service_code,requirement_name,is_mandatory,requires_upload,applies_when) values($1,$2,$3,$4,$5::jsonb)", [r.service_code,r.requirement_name,r.is_mandatory,r.requires_upload,JSON.stringify(r.applies_when)]);
  }
  await db.exec(migration);
  await db.exec(migration);

  const versions = await db.query<{ definition: unknown }>("select definition from form_template_versions order by version");
  expect(versions.rows).toHaveLength(2);
  expect(versions.rows[0].definition).toEqual(fixture.definition);
  const definition = parseFormTemplateDefinition(versions.rows[1].definition);
  const caseDefinition = { ...definition, sections: definition.sections.filter(s => s.step === "case") };
  const answers = { event_date: "2010-01-01", event_place: "Legazpi City", father_on_record: "yes", filer_relationship: "mother" };
  expect(validateTemplateAnswers(caseDefinition, answers).success).toBe(true);
  expect(validateTemplateAnswers(caseDefinition, { ...answers, father_on_record: "no" }).success).toBe(true);
  const unsure = validateTemplateAnswers(caseDefinition, { ...answers, father_on_record: "not_sure" });
  expect(unsure.success).toBe(false);
  if (!unsure.success) expect(unsure.message).toContain("does not waive");
  const relationship = fieldsForStep(definition, "case").find(f => f.key === "filer_relationship");
  expect(relationship?.options?.find(o => o.value === "other_relative")?.notice?.description).toContain("does not establish authority");
  expect(relationship?.helpText).toContain("age 7 in both ranges");

  const { rows } = await db.query<ServiceRequirement>("select * from service_requirements_metadata");
  expect(rows).toHaveLength(3);
  expect(rows.every(r => r.requires_upload && r.is_mandatory && r.where_to_secure)).toBe(true);
  expect(rows.find(r => r.requirement_name.includes("birth certificate"))?.where_to_secure).toBe("LCRO and PSA");
  expect(rows.filter(r => !r.requirement_name.includes("birth certificate")).every(r => r.where_to_secure === "LCRO or any Notary Public")).toBe(true);
  const paternity = rows.find(r => r.requirement_name.includes("Admission of Paternity"))!;
  expect(isRequirementApplicable(paternity, "RA9255_SURNAME", { father_on_record: "no" })).toBe(true);
  expect(isRequirementApplicable(paternity, "RA9255_SURNAME", { father_on_record: "yes" })).toBe(false);

  const service = (await db.query<{ fee: string; fee_components: unknown }>("select * from services_registry where service_code='RA9255_SURNAME'")).rows[0];
  const components = parseFeeComponents(service.fee_components);
  expect(totalFee(service.fee, 1, false)).toBe(355);
  expect(feeComponentsIssue(components, Number(service.fee))).toBeNull();
  expect(splitFeeComponents(components).alsoPayable).toEqual([
    expect.objectContaining({ amount: 100, note: expect.stringContaining("If with paternity") }),
    expect.objectContaining({ amount: 5, unit: "page" }),
  ]);
  expect((await db.query<{ fee: string }>("select fee from services_registry where service_code='UNRELATED'")).rows[0].fee).toBe("999");
}, 30_000);
