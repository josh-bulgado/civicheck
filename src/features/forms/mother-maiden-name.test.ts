import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import { motherMaidenName } from "./mother-maiden-name";
import { canonicalizeTemplateAnswers, fieldsForStep, parseFormTemplateDefinition, validateTemplateAnswers } from "./form-template.utils";

it("joins the name for PDFs and keeps older requests readable", () => {
  expect(motherMaidenName({ mother_first_name: "Maria", mother_middle_name: "N/A", mother_last_name: "Santos" })).toBe("Maria Santos");
  expect(motherMaidenName({ mother_first_name: "Maria", mother_middle_name: "Reyes", mother_last_name: "Santos", mother_maiden_name: "Old value" })).toBe("Maria Reyes Santos");
  expect(motherMaidenName({ mother_maiden_name: "Maria Reyes Santos" })).toBe("Maria Reyes Santos");
});

it("splits both templates, keeps birth-only visibility and old versions, and can run twice", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table form_templates(id int primary key,template_key text,active_version_id uuid,updated_at timestamptz);
      create table form_template_versions(id uuid default gen_random_uuid(),template_id int,version int,status text,definition jsonb,published_at timestamptz);`);
    const original = { schemaVersion: 1, sections: [{ key: "details", step: "details", title: "Details", fields: [
      { key: "record_type", type: "select", label: "Record", required: true, options: [{ value: "birth", label: "Birth" }, { value: "death", label: "Death" }, { value: "marriage", label: "Marriage" }] },
      { key: "subjects", type: "person_group", label: "Owner", required: false },
      { key: "mother_maiden_name", type: "text", label: "Mother's maiden name", required: true, visibleWhen: { field: "record_type", operator: "equals", value: "birth" } },
    ] }] };
    for (const [index, key] of ["ctc_issuance", "email_inquiry", "elec_endorsement"].entries()) {
      await db.query("insert into form_templates(id,template_key) values ($1,$2)", [index + 1,key]);
      await db.query("insert into form_template_versions(template_id,version,status,definition) values ($1,1,'published',$2)", [index + 1,JSON.stringify(original)]);
    }
    await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
    const migration = readFileSync(new URL("../../../supabase/migrations/20261111143936_split_mother_maiden_name_fields.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec(migration);
    const { rows } = await db.query<{ template_key: string; version: number; definition: unknown }>("select t.template_key,v.version,v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id");
    for (const row of rows) {
      if (row.template_key === "elec_endorsement") {
        expect(row.definition).toEqual(original);
        expect(row.version).toBe(1);
        continue;
      }
      expect(row.version).toBe(2);
      const form = parseFormTemplateDefinition(row.definition);
      const fields = fieldsForStep(form, "details");
      expect(fields.filter(field => field.key.startsWith("mother_")).map(field => field.key)).toEqual(["mother_first_name", "mother_middle_name", "mother_last_name"]);
      expect(fields.find(field => field.key === "mother_middle_name")?.noneLabel).toBe("No middle name");
      const answers = { record_type: "birth", mother_first_name: "Maria", mother_middle_name: "N/A", mother_last_name: "Santos" };
      expect(validateTemplateAnswers(form, answers)).toEqual({ success: true });
      expect(validateTemplateAnswers(form, { ...answers, mother_middle_name: "" }).success).toBe(false);
      expect(validateTemplateAnswers(form, { ...answers, mother_last_name: "123" }).success).toBe(false);
      for (const record_type of ["death", "marriage"]) {
        const other = canonicalizeTemplateAnswers(form, { ...answers, record_type });
        expect(other.mother_first_name).toBeUndefined();
        expect(validateTemplateAnswers(form, other)).toEqual({ success: true });
      }
    }
    const old = await db.query<{ definition: unknown }>("select definition from form_template_versions where version=1");
    for (const row of old.rows) expect(row.definition).toEqual(original);
  } finally { await db.close(); }
}, 30_000);
