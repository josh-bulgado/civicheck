import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import { parseFormTemplateDefinition, isFieldVisible, validateTemplateAnswers, flattenTemplateAnswers, visibleCaseSelectorQuestions, canonicalizeTemplateAnswers, resolveCaseSelectorServiceCode } from "./form-template.utils";
import { birthCaseForService } from "~/features/requests/walk-in-birth";
import delayedFixture from "~/features/services/fixtures/birth-delayed-requirements.json";

const migration = readFileSync(new URL("../../../supabase/migrations/20261110061141_birth_father_name_fields.sql", import.meta.url), "utf8");

it("publishes required marital names and optional non-marital/CTC full names without rewriting history", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table form_templates(id uuid primary key default gen_random_uuid(),template_key text,active_version_id uuid,updated_at timestamptz);
      create table form_template_versions(id uuid primary key default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);`);
    const original = { ...delayedFixture.definition, sections: delayedFixture.definition.sections.map((section) => section.step === "case" ? {
      ...section, fields: [...section.fields, {key: "record_type", type: "select", label: "Record type", required: false, options: [{value: "birth", label: "Birth"}, {value: "death", label: "Death"}]}],
    } : section) };
    for (const key of ["birth_ontime", "birth_delayed", "ctc_issuance", "unrelated"]) {
      await db.query("insert into form_templates(template_key) values($1)", [key]);
      await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$2::jsonb from form_templates where template_key=$1", [key, JSON.stringify(original)]);
    }
    await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
    await db.exec(migration);
    await db.exec(migration);
    const { rows } = await db.query<{template_key: string; definition: unknown}>("select t.template_key,v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id");
    for (const row of rows) {
      if (row.template_key === "unrelated") { expect(row.definition).toEqual(original); continue; }
      const definition = parseFormTemplateDefinition(row.definition);
      const fields = definition.sections.flatMap((section) => section.fields).filter((field) => field.key.startsWith("father_"));
      if (row.template_key === "ctc_issuance") {
        expect(fields.map((field) => field.key)).toEqual(["father_name"]);
        expect(fields[0].required).toBe(false);
        expect(isFieldVisible(fields[0], {record_type: "birth"})).toBe(true);
        expect(isFieldVisible(fields[0], {record_type: "death"})).toBe(false);
        continue;
      }
      expect(fields.filter((field) => isFieldVisible(field, {marital: "marital"})).map((field) => field.key)).toEqual(["father_last_name", "father_middle_name", "father_first_name"]);
      expect(fields.filter((field) => isFieldVisible(field, {marital: "non-marital"})).map((field) => field.key)).toEqual(["father_name"]);
      const fatherForm = {schemaVersion: 1 as const, sections: [{key: "father", title: "Father", step: "details" as const, fields}]};
      const answers = {marital: "marital", father_last_name: "Cruz", father_middle_name: "Santos", father_first_name: "Juan"};
      expect(validateTemplateAnswers(fatherForm, answers).success).toBe(true);
      for (const key of ["father_last_name", "father_middle_name", "father_first_name"]) {
        expect(validateTemplateAnswers(fatherForm, {...answers, [key]: ""}).success).toBe(false);
      }
      expect(validateTemplateAnswers(fatherForm, {marital: "non-marital"}).success).toBe(true);
      expect(validateTemplateAnswers(fatherForm, {marital: "non-marital", father_name: "123"}).success).toBe(false);
      expect(flattenTemplateAnswers(fatherForm, answers)).toMatchObject({father_last_name: "Cruz", father_middle_name: "Santos", father_first_name: "Juan"});
      const walkIn = birthCaseForService(definition, "DCOLB-0079-BRAP");
      expect(walkIn.definition.sections.some((section) => section.fields.some((field) => field.key === "marital" && field.required))).toBe(true);
      for (const code of ["DCOLB-0079-BRAP", "DCOLB-80UP-BRAP"]) {
        const selected = birthCaseForService(definition, code);
        for (const marital of ["marital", "non-marital"]) {
          const answers = canonicalizeTemplateAnswers(definition, {
            event_date: code.includes("80UP") ? "1940-01-01" : "2000-01-01", program: "brap", marital,
          }, "2026-11-15");
          expect(visibleCaseSelectorQuestions(definition, answers).some((q) => q.key === "marital")).toBe(true);
          expect(resolveCaseSelectorServiceCode(definition, answers)).toBe(code);
          for (const form of [definition, selected.definition]) {
            const visible = form.sections.flatMap((s) => s.fields).filter((f) => f.key.startsWith("father_") && isFieldVisible(f, answers));
            expect(visible.map((f) => f.key)).toEqual(marital === "marital" ? ["father_last_name", "father_middle_name", "father_first_name"] : ["father_name"]);
            expect(visible.every((f) => f.required === (marital === "marital"))).toBe(true);
          }
        }
      }
      const normal = birthCaseForService(definition, "DCOLB-0079-NORMAL-MARITAL");
      expect(normal.answers.marital).toBe("marital");
    }
    const count = await db.query<{count: number}>("select count(*)::int as count from form_template_versions");
    expect(count.rows[0].count).toBe(7);
    const history = await db.query<{definition: unknown}>("select definition from form_template_versions where version=1");
    for (const row of history.rows) expect(row.definition).toEqual(original);
  } finally { await db.close(); }
}, 30_000);
