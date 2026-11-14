import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
import originals from "./marriage-event-details.fixtures.json";
import { evaluateTemplateEventTiming, fieldsForStep, parseFormTemplateDefinition, validateTemplateAnswers } from "./form-template.utils";

const db = new PGlite();
const migration = readFileSync(new URL("../../../supabase/migrations/20261114142811_move_marriage_event_details.sql", import.meta.url), "utf8");
beforeAll(async () => {
  await db.exec(`create table form_templates(id uuid primary key default gen_random_uuid(), template_key text, active_version_id uuid, updated_at timestamptz);
    create table form_template_versions(id uuid primary key default gen_random_uuid(), template_id uuid, version int, status text, definition jsonb, published_at timestamptz);`);
  for (const original of originals) {
    await db.query("insert into form_templates(template_key) values ($1)", [original.template_key]);
    await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$2::jsonb from form_templates where template_key=$1", [original.template_key, JSON.stringify(original.definition)]);
  }
  await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
  await db.exec(migration);
}, 30_000);
afterAll(() => db.close());

it.each(originals)("moves $template_key dates after names without changing rules", async (original) => {
  const { rows } = await db.query<{ definition: unknown }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id where template_key=$1", [original.template_key]);
  const definition = parseFormTemplateDefinition(rows[0].definition);
  const previous = parseFormTemplateDefinition(original.definition);
  expect(fieldsForStep(definition, "case").some(f => ["event_date", "event_place"].includes(f.key))).toBe(false);
  expect(fieldsForStep(definition, "details").map(f => f.key)).toEqual(["account_party_role", "subjects", "event_date", "event_place", "contact_number"]);
  expect(definition.eventTiming).toEqual(previous.eventTiming);
  for (const key of ["event_date", "event_place"]) {
    expect(fieldsForStep(definition, "details").find(f => f.key === key)).toEqual(fieldsForStep(previous, "case").find(f => f.key === key));
  }
  const subjects = ["Bride", "Groom"].map(role => ({ role, firstName: "Ana", middleName: "Santos", lastName: "Cruz", suffix: "", sex: role === "Bride" ? "female" : "male" }));
  for (const [basis, boundary, outside] of [["with_license", "2026-10-30", "2026-10-29"], ["article_34", "2026-10-15", "2026-10-14"], ["pd_1083", "2026-10-15", "2026-10-14"]]) {
    for (const event_date of [boundary, outside, "2026-11-15", ""]) {
      const answers = { registration_type: "delayed", marriage_license_basis: basis, has_marriage_agreement: "no", solemnized_in_legazpi: "yes", account_party_role: "Bride", subjects, event_date, event_place: "Legazpi City, Albay" };
      expect(evaluateTemplateEventTiming(definition, answers, "2026-11-14")).toEqual(evaluateTemplateEventTiming(previous, answers, "2026-11-14"));
      expect(validateTemplateAnswers(definition, answers, "2026-11-14")).toEqual(validateTemplateAnswers(previous, answers, "2026-11-14"));
      if (!event_date || event_date === "2026-11-15") expect(validateTemplateAnswers(definition, answers, "2026-11-14").success).toBe(false);
    }
  }
  if (original.template_key === "marriage_delayed") {
    expect(evaluateTemplateEventTiming(definition, { registration_type: "reconstruction", marriage_license_basis: "with_license", event_date: "2026-11-13" }, "2026-11-14")).toBeNull();
  }
});

it("preserves previous versions and does not republish on repeat", async () => {
  await db.exec(migration);
  const { rows } = await db.query<{ count: number }>("select count(*)::int as count from form_template_versions");
  expect(rows[0].count).toBe(4);
  for (const original of originals) {
    const prior = await db.query<{ definition: unknown }>("select v.definition from form_template_versions v join form_templates t on t.id=v.template_id where t.template_key=$1 and v.version=1", [original.template_key]);
    expect(prior.rows[0].definition).toEqual(original.definition);
  }
});
