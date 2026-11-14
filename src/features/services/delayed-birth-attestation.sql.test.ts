import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import fixture from "./fixtures/birth-delayed-requirements.json";
import { canonicalizeTemplateAnswers, parseFormTemplateDefinition } from "~/features/forms/form-template.utils";
import { isRequirementApplicable } from "./service-utils";

const sql = readFileSync(new URL("../../../supabase/migrations/20261110070150_delayed_birth_attestation_age.sql", import.meta.url), "utf8");

it("separates attestation without losing the original requirement ID or old form version", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table form_templates(id uuid primary key default gen_random_uuid(),template_key text,active_version_id uuid,updated_at timestamptz);
      create table form_template_versions(id uuid primary key default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);
      create table service_requirements_metadata(id uuid primary key default gen_random_uuid(),requirement_group text,requirement_name text,is_mandatory boolean default true,requires_upload boolean default true,case_tag text,where_to_secure text,sort_order int,applies_when jsonb);`);
    const original = {...fixture.definition, derivedAnswers: fixture.definition.derivedAnswers.filter((answer) => answer.key !== "attestation_age")};
    await db.query("insert into form_templates(template_key) values ('birth_delayed')");
    await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$1::jsonb from form_templates", [JSON.stringify(original)]);
    await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
    const {rows: existing} = await db.query<{id: string}>("insert into service_requirements_metadata(requirement_group,requirement_name,case_tag) values('birth_delayed','Acknowledgement / Admission of Paternity + Affidavit to Use Surname of Father + Sworn Attestation of mother/guardian for ages 7-17','non_marital_only') returning id");
    await db.exec(sql);
    await db.exec(sql);
    const {rows: requirements} = await db.query<{id: string; requirement_name: string; applies_when: Parameters<typeof isRequirementApplicable>[0]["applies_when"]}>("select id,requirement_name,applies_when from service_requirements_metadata order by requirement_name");
    expect(requirements).toHaveLength(2);
    expect(requirements.find((row) => row.id === existing[0].id)?.requirement_name).not.toContain("Sworn Attestation");
    const attestation = requirements.find((row) => row.requirement_name.startsWith("Sworn Attestation"))!;
    const {rows: versions} = await db.query<{definition: unknown}>("select definition from form_template_versions order by version");
    expect(versions).toHaveLength(2);
    expect(versions[0].definition).toEqual(original);
    const definition = parseFormTemplateDefinition(versions[1].definition);
    for (const [event_date, expected] of [["2020-11-10", false], ["2019-11-10", true], ["2009-11-10", true], ["2008-11-10", false]] as const) {
      const answers = canonicalizeTemplateAnswers(definition, {event_date, program: "brap", marital: "non-marital"}, "2026-11-10");
      expect(isRequirementApplicable(attestation, "DCOLB-0079-BRAP", answers)).toBe(expected);
      expect(isRequirementApplicable(attestation, "DCOLB-0079-BRAP", {...answers, marital: "marital"})).toBe(false);
    }
  } finally { await db.close(); }
}, 30_000);
