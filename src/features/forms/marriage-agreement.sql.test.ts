import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import { fieldsForStep, parseFormTemplateDefinition, validateTemplateAnswers } from "./form-template.utils";
import { isRequirementApplicable } from "../services/service-utils";
import type { ConditionRule } from "./form-template.types";

it("publishes the agreement question and requires the attachment only for Yes", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table form_templates(id int primary key,template_key text,active_version_id uuid,updated_at timestamptz);
      create table form_template_versions(id uuid default gen_random_uuid(),template_id int,version int,status text,definition jsonb,published_at timestamptz);
      create table service_requirements_metadata(service_code text,requirement_name text,is_mandatory boolean,requires_upload boolean,applies_when jsonb);
      insert into form_templates(id,template_key) values(1,'marriage_ontime');
      insert into service_requirements_metadata values('MARRIAGE_ONTIME','Dowry Agreement Form / Marital Settlement Agreement / Prenuptial Agreement, if applicable',false,true,null);`);
    const original = { schemaVersion: 1, sections: [{ key: "case", step: "case", title: "Case details", fields: [
      { key: "marriage_license_basis", type: "select", label: "Marriage basis", required: true,
        options: ["with_license", "article_34", "pd_1083"].map(value => ({ value, label: value })) },
      { key: "event_place", type: "text", label: "Place", required: false },
    ] }, { key: "details", step: "details", title: "Names", fields: [
      { key: "subjects", type: "person_group", label: "Names", required: false },
    ] }] };
    await db.query("insert into form_template_versions(template_id,version,status,definition) values(1,1,'published',$1)", [JSON.stringify(original)]);
    await db.exec("update form_templates set active_version_id=(select id from form_template_versions)");
    const sql = readFileSync(new URL("../../../supabase/migrations/20261110103901_marriage_agreement_attachment.sql", import.meta.url), "utf8");
    await db.exec(sql);
    const { rows } = await db.query<{ definition: unknown }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id");
    const definition = parseFormTemplateDefinition(rows[0].definition);
    expect(fieldsForStep(definition, "case").map(f => f.key)).toEqual(["marriage_license_basis", "has_marriage_agreement", "event_place"]);
    const { rows: requirements } = await db.query<{ is_mandatory: boolean; requires_upload: boolean; applies_when: ConditionRule }>("select * from service_requirements_metadata");
    const requirement = requirements[0];
    expect(requirement.is_mandatory).toBe(true);
    expect(requirement.requires_upload).toBe(true);
    for (const marriage_license_basis of ["with_license", "article_34", "pd_1083"]) {
      expect(validateTemplateAnswers(definition, { marriage_license_basis }).success).toBe(false);
      for (const has_marriage_agreement of ["yes", "no"]) {
        const answers = { marriage_license_basis, has_marriage_agreement };
        expect(validateTemplateAnswers(definition, answers).success).toBe(true);
        expect(isRequirementApplicable(requirement, "MARRIAGE_ONTIME", answers)).toBe(has_marriage_agreement === "yes");
      }
    }
    await db.exec(sql);
    const { rows: versions } = await db.query<{ definition: unknown }>("select definition from form_template_versions order by version");
    expect(versions).toHaveLength(2);
    expect(versions[0].definition).toEqual(original);
  } finally {
    await db.close();
  }
}, 30_000);
