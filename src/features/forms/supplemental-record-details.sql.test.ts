import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import previousForm from "../requests/fixtures/supplemental-walk-in-form.json";
import { parseFormTemplateDefinition } from "./form-template.utils";

const migration = readFileSync(new URL("../../../supabase/migrations/20261113181633_supplemental_report_record_details.sql", import.meta.url), "utf8");

it("moves supplemental event fields below main details and publishes only once", async () => {
  const previous = parseFormTemplateDefinition(previousForm);
  const db = new PGlite();
  try {
    await db.exec(`
      create table form_templates(id uuid primary key,active_version_id uuid,updated_at timestamptz);
      create table form_template_versions(id uuid primary key default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);
      create table service_form_templates(service_code text,template_id uuid);
      insert into form_templates values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',now());
      insert into service_form_templates values('SUPPLEMENTAL_REPORT','00000000-0000-4000-8000-000000000001');
    `);
    await db.query("insert into form_template_versions(id,template_id,version,status,definition) values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',1,'published',$1)", [JSON.stringify(previous)]);
    await db.exec(migration);
    await db.exec(migration);
    const { rows } = await db.query<{ definition: unknown; version: number }>("select definition,version from form_template_versions order by version");
    expect(rows).toHaveLength(2);
    expect(rows[0].definition).toEqual(previous);
    const definition = parseFormTemplateDefinition(rows[1].definition);
    const caseFields = definition.sections.filter(section => section.step === "case").flatMap(section => section.fields);
    const details = definition.sections.filter(section => section.step === "details").flatMap(section => section.fields);
    expect(caseFields.find(field => field.key === "record_type")?.label).toBe("Which certificate needs additional information?");
    expect(caseFields.some(field => ["event_date", "event_place"].includes(field.key))).toBe(false);
    const mainKeys = previous.sections.filter(section => section.step === "details")
      .flatMap(section => section.fields).filter(field => field.key !== "contact_number").map(field => field.key);
    expect(details.map(field => field.key)).toEqual([...mainKeys, "event_date", "event_place", "contact_number"]);
    for (const type of ["birth", "death", "marriage"]) {
      expect(details.find(field => field.key === "event_date")?.labelByAnswer?.labels[type]).toBe(`Date of ${type}`);
      expect(details.find(field => field.key === "event_place")?.labelByAnswer?.labels[type]).toBe(`Place of ${type}`);
    }
    expect(details.filter(field => ["event_date", "event_place"].includes(field.key)).every(field => field.required)).toBe(true);
    expect((await db.query<{ active_version_id: string }>("select active_version_id from form_templates")).rows[0].active_version_id)
      .not.toBe("00000000-0000-4000-8000-000000000002");
    for (const name of [
      "20261113182200_supplemental_report_required_fields_first.sql",
      "20261113182355_remove_supplemental_entry_help_text.sql",
      "20261113182857_supplemental_record_fields_after_name.sql",
    ]) {
      const sql = readFileSync(new URL(`../../../supabase/migrations/${name}`, import.meta.url), "utf8");
      await db.exec(sql);
      const count = (await db.query<{ count: number }>("select count(*) as count from form_template_versions")).rows[0].count;
      await db.exec(sql);
      expect((await db.query<{ count: number }>("select count(*) as count from form_template_versions")).rows[0].count).toBe(count);
    }
    const latest = await db.query<{ definition: unknown }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id");
    const final = parseFormTemplateDefinition(latest.rows[0].definition);
    const finalCase = final.sections.filter(section => section.step === "case").flatMap(section => section.fields);
    expect(finalCase.map(field => field.key)).toEqual(["record_type", "entry_to_supplement", "information_to_add", "reference_number", "additional_notes"]);
    expect(finalCase.filter(field => ["entry_to_supplement", "information_to_add"].includes(field.key))
      .every(field => field.helpText === undefined)).toBe(true);
    const finalDetails = final.sections.filter(section => section.step === "details").flatMap(section => section.fields);
    expect(finalDetails.map(field => field.key)).toEqual([mainKeys[0], "event_date", "event_place", ...mainKeys.slice(1), "contact_number"]);
  } finally { await db.close(); }
});
