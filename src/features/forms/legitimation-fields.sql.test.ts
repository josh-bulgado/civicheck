import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import original from "../requests/fixtures/legitimation-walk-in-form.json";
import { parseFormTemplateDefinition, validateTemplateAnswers } from "./form-template.utils";
import { walkInCaseForService } from "../requests/walk-in-legitimation";

const migration = readFileSync(new URL("../../../supabase/migrations/20261111131637_polish_legitimation_fields.sql", import.meta.url), "utf8");

it("publishes the requested labels and choices while preserving old forms and requirement conditions", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table form_templates(id uuid primary key, active_version_id uuid, updated_at timestamptz);
      create table form_template_versions(id uuid primary key default gen_random_uuid(), template_id uuid, version int, status text, definition jsonb, published_at timestamptz);
      create table service_form_templates(service_code text, template_id uuid);
      create table services_registry(service_code text, event_place_label text, reference_number_label text);
      create table service_requirements_metadata(service_code text, requirement_name text, applies_when jsonb);
      insert into services_registry values ('LEGITIMATION', 'Place where the child was born or registered', 'Registry number (if known)');
      insert into service_requirements_metadata values ('LEGITIMATION', '[Father''s name is blank] Admission of Paternity, original copy', '{"conditions":[{"field":"father_on_record","operator":"equals","value":"no"}]}');
    `);
    const id = "00000000-0000-4000-8000-000000000001";
    const old = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into form_templates values ($1,$2,now())", [id, old]);
    await db.query("insert into form_template_versions(id,template_id,version,status,definition) values($1,$2,1,'published',$3)", [old, id, JSON.stringify(original)]);
    await db.query("insert into service_form_templates values('LEGITIMATION',$1)", [id]);
    await db.exec(migration);
    await db.exec(migration);
    const { rows } = await db.query<{ definition: typeof original }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id");
    const definition = parseFormTemplateDefinition(rows[0].definition);
    const fields = definition.sections.flatMap(section => section.fields);
    expect(fields.find(field => field.key === "event_place")?.label).toBe("Child's Place of Birth");
    expect(fields.find(field => field.key === "marriage_date")).toMatchObject({ label: "Parent's Date of Marriage" });
    expect(fields.find(field => field.key === "marriage_place")?.label).toBe("Parent's Place of Marriage");
    expect(fields.find(field => field.key === "reference_number")?.label).not.toMatch(/if known/i);
    for (const key of ["marriage_date", "father_on_record"]) expect(fields.find(field => field.key === key)?.helpText).toBeUndefined();
    expect(fields.find(field => field.key === "father_on_record")?.options?.map(option => option.value)).toEqual(["yes", "no"]);
    expect(validateTemplateAnswers(definition, { father_on_record: "not_sure" }).success).toBe(false);
    const walkInFields = walkInCaseForService(definition, "LEGITIMATION").definition.sections.flatMap(section => section.fields);
    expect(walkInFields.find(field => field.key === "marriage_place")).toMatchObject({ label: "Parent's Place of Marriage", required: false });
    expect(walkInFields.find(field => field.key === "father_on_record")?.helpText).toBeUndefined();
    expect((await db.query<{ definition: typeof original }>("select definition from form_template_versions where id=$1", [old])).rows[0].definition).toEqual(original);
    expect((await db.query("select * from form_template_versions")).rows).toHaveLength(2);
    expect((await db.query("select requirement_name,applies_when from service_requirements_metadata")).rows[0]).toEqual({
      requirement_name: "Admission of Paternity, original copy",
      applies_when: { conditions: [{ field: "father_on_record", operator: "equals", value: "no" }] },
    });
  } finally {
    await db.close();
  }
}, 30_000);
