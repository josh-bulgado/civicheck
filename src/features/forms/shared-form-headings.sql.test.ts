import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import { parseFormTemplateDefinition } from "./form-template.utils";

it("publishes record headings, preserves existing labels and historical fields, and is repeatable", async () => {
  const db = new PGlite();
  try {
    const migration = readFileSync(new URL("../../../supabase/migrations/20261111125655_share_selected_form_helpers.sql", import.meta.url), "utf8");
    await db.exec(`create table form_templates(id int primary key, template_key text, active_version_id uuid, updated_at timestamptz);
      create table form_template_versions(id uuid default gen_random_uuid(),template_id int,version int,status text,definition jsonb,published_at timestamptz);`);
    const original = {
      schemaVersion: 1,
      sections: [{ key: "details", step: "details", title: "Details", fields: [
        { key: "record_type", type: "select", label: "Record", options: [{ value: "birth", label: "Birth" }, { value: "death", label: "Death" }] },
        { key: "subjects", type: "person_group", label: "Owner", required: true,
          labelByAnswer: { field: "record_type", labels: { marriage: "Name of Husband" } } },
        { key: "father_middle_name", type: "text", label: "Middle name", noneLabel: "No middle name" },
      ] }],
    };
    for (const [index, key] of ["email_inquiry", "supplemental_report", "other_cert", "ra9048_10172", "birth_ontime"].entries()) {
      await db.query("insert into form_templates(id,template_key) values ($1,$2)", [index + 1, key]);
      await db.query("insert into form_template_versions(template_id,version,status,definition) values ($1,1,'published',$2)", [index + 1, JSON.stringify(original)]);
    }
    await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
    await db.exec(migration);
    await db.exec(migration);
    const { rows } = await db.query<{ template_key: string; version: number; definition: unknown }>(
      "select t.template_key,v.version,v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id",
    );
    for (const row of rows) {
      const definition = parseFormTemplateDefinition(row.definition);
      if (row.template_key === "birth_ontime") {
        expect(row.version).toBe(1);
        expect(row.definition).toEqual(original);
        continue;
      }
      expect(row.version).toBe(2);
      const fields = definition.sections[0].fields;
      expect(fields[1].labelByAnswer?.labels).toMatchObject({ birth: "Full name on the birth certificate", death: "Full name of the deceased", marriage: "Name of Husband" });
      expect(fields[2].noneLabel).toBe("No middle name");
      expect(fields.map((field) => field.key)).toEqual(original.sections[0].fields.map((field) => field.key));
    }
    const old = await db.query<{ definition: unknown }>("select definition from form_template_versions where version=1");
    expect(old.rows.every((row) => JSON.stringify(row.definition) === JSON.stringify(old.rows[0].definition))).toBe(true);
    expect(old.rows[0].definition).toEqual(original);
  } finally {
    await db.close();
  }
}, 30_000);
