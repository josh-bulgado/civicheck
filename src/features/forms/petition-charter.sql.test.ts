import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, expect, it } from "vitest";
import fixture from "./fixtures/petition-charter.json";
import { fieldsForStep, parseFormTemplateDefinition } from "./form-template.utils";
import { isRequirementApplicable } from "../services/service-utils";
import type { ServiceRequirement } from "../admin/services/services.types";

const db = new PGlite();
const migration = readFileSync(new URL("../../../supabase/migrations/20261111015243_petition_charter_requirements.sql", import.meta.url), "utf8");
afterAll(() => db.close());

it("aligns petition requirements, preserves versions, and requires indigency evidence only when claimed", async () => {
  await db.exec(`create table form_templates(id uuid primary key default gen_random_uuid(), template_key text, active_version_id uuid, updated_at timestamptz);
    create table form_template_versions(id uuid primary key default gen_random_uuid(), template_id uuid, version int, status text, definition jsonb, published_at timestamptz);
    create table service_requirements_metadata(id uuid default gen_random_uuid(), requirement_group text, requirement_name text, is_mandatory boolean, requires_upload boolean, sort_order int, applies_when jsonb, where_to_secure text);`);
  await db.query("insert into form_templates(template_key) values ('ra9048_10172')");
  await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$1::jsonb from form_templates", [JSON.stringify(fixture.definition)]);
  await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
  for (const r of fixture.requirements) {
    await db.query("insert into service_requirements_metadata(requirement_group,requirement_name,is_mandatory,requires_upload,sort_order,applies_when) values($1,$2,$3,$4,$5,$6::jsonb)", [r.requirement_group,r.requirement_name,r.is_mandatory,r.requires_upload,r.sort_order,JSON.stringify(r.applies_when)]);
  }
  await db.exec(migration);
  await db.exec(migration);
  const versions = await db.query<{definition: unknown}>("select definition from form_template_versions order by version");
  expect(versions.rows).toHaveLength(2);
  expect(versions.rows[0].definition).toEqual(fixture.definition);
  const definition = parseFormTemplateDefinition(versions.rows[1].definition);
  const fields = fieldsForStep(definition, "case");
  expect(fields.find(f => f.key === "filing_fee_exemption")?.required).toBe(true);
  expect(fields.find(f => f.key === "petitioner_relationship")?.helpText).toContain("verify your authority");
  expect(definition.caseSelector?.description).toContain("before accepting");
  const { rows } = await db.query<ServiceRequirement>("select * from service_requirements_metadata");
  const indigency = rows.filter(r => r.requirement_name.startsWith("Certificate of Indigency"));
  expect(indigency).toHaveLength(1);
  expect(indigency[0].requires_upload).toBe(true);
  expect(isRequirementApplicable(indigency[0], "RA9048-CFN", { filing_fee_exemption: "yes" })).toBe(true);
  expect(isRequirementApplicable(indigency[0], "RA9048-CFN", { filing_fee_exemption: "no" })).toBe(false);
  expect(rows.find(r => r.requirement_name.includes("At least 3"))?.requirement_name).toContain("2 original/certified photocopies of each");
  expect(rows.find(r => r.requirement_name.includes("Clearance/certification"))?.requirement_name).toContain("affidavit of non-employment/self-employment");
  expect(rows.find(r => r.requirement_name.includes("Notice and Certificate"))?.requires_upload).toBe(false);
  expect(rows.filter(r => !r.requirement_name.startsWith("Additional") && !r.requirement_name.startsWith("Certificate of Indigency")).every(r => r.where_to_secure)).toBe(true);
}, 30_000);
