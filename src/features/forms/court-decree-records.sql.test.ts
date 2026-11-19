import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import currentForm from "../requests/fixtures/court-decree-walk-in-form.json";
import { parseFormTemplateDefinition } from "./form-template.utils";

const migration = readFileSync(new URL("../../../supabase/migrations/20261113141322_court_decree_record_identification.sql", import.meta.url), "utf8");

it("publishes record-search fields once and preserves the earlier form", async () => {
  const previous = structuredClone(currentForm);
  const addedKeys = ["birth_date", "birth_place", "marriage_date", "marriage_place", "reference_number"];
  previous.sections.forEach((section) => { section.fields = section.fields.filter((field) => !addedKeys.includes(field.key)); });
  previous.caseSelector.questions = previous.caseSelector.questions.filter((question) => question.key !== "record_type");
  const db = new PGlite();
  try {
    await db.exec(`
      create table form_templates(id uuid primary key,template_key text,active_version_id uuid,updated_at timestamptz);
      create table form_template_versions(id uuid primary key default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);
      insert into form_templates values('00000000-0000-4000-8000-000000000001','court_decree','00000000-0000-4000-8000-000000000002',now());
    `);
    await db.query("insert into form_template_versions(id,template_id,version,status,definition) values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',5,'published',$1)", [JSON.stringify(previous)]);
    await db.exec(migration);
    await db.exec(migration);
    const { rows } = await db.query<{ definition: unknown; version: number }>("select definition,version from form_template_versions order by version");
    expect(rows).toHaveLength(2);
    expect(rows[0].definition).toEqual(previous);
    expect(rows[1].version).toBe(6);
    expect(parseFormTemplateDefinition(rows[1].definition)).toEqual(parseFormTemplateDefinition(currentForm));
  } finally { await db.close(); }
});
