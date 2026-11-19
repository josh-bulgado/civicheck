import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import fixture from "./fixtures/petition-charter.json";
import { canonicalizeTemplateAnswers, fieldsForStep, flattenTemplateAnswers, parseFormTemplateDefinition } from "./form-template.utils";

it("moves record fields once, keeps draft answers and corrected date separate, and preserves old versions", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table form_templates(id uuid primary key default gen_random_uuid(),template_key text,active_version_id uuid,updated_at timestamptz);
      create table form_template_versions(id uuid primary key default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);
      insert into form_templates(template_key) values('ra9048_10172');`);
    await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$1::jsonb from form_templates", [JSON.stringify(fixture.definition)]);
    await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
    const migration = readFileSync(new URL("../../../supabase/migrations/20261113083302_move_petition_record_details.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec(migration);
    const { rows } = await db.query<{definition: unknown}>("select definition from form_template_versions order by version");
    expect(rows).toHaveLength(2);
    expect(rows[0].definition).toEqual(fixture.definition);
    const definition = parseFormTemplateDefinition(rows[1].definition);
    const caseKeys = fieldsForStep(definition, "case").map(f => f.key);
    const details = fieldsForStep(definition, "details");
    expect(caseKeys).not.toContain("event_date");
    expect(caseKeys).not.toContain("event_place");
    expect(caseKeys).toContain("corrected_birth_date");
    expect(details.slice(0,3).map(f => f.key)).toEqual(["subjects", "event_date", "event_place"]);
    for (const key of ["event_date", "event_place"]) {
      expect(details.filter(f => f.key === key)).toHaveLength(1);
      expect(details.find(f => f.key === key)?.helpText).toBeUndefined();
    }
    const answers = canonicalizeTemplateAnswers(definition, { change_first_name: "no", correct_other: "no", correct_sex: "no", correct_birth_day_month: "yes",
      event_date: "2000-01-01", event_place: "Legazpi City, Albay", corrected_birth_date: "2000-02-01" });
    expect(flattenTemplateAnswers(definition, answers)).toMatchObject({ event_date: "2000-01-01", event_place: "Legazpi City, Albay", corrected_birth_date: "2000-02-01" });
  } finally { await db.close(); }
}, 30_000);
