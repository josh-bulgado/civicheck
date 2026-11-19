import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
import fixture from "../requests/fixtures/marriage-license-form.json";
import { canonicalizeTemplateAnswers, deriveTemplateAnswers, fieldsForStep, flattenTemplateAnswers, parseFormTemplateDefinition, validateTemplateAnswers } from "../forms/form-template.utils";
import { walkInCaseForService } from "../requests/walk-in-legitimation";
import type { FormTemplateDefinition } from "../forms/form-template.types";

const db = new PGlite();
const migration = readFileSync(new URL("../../../supabase/migrations/20261114134653_marriage_license_birth_dates_in_details.sql", import.meta.url), "utf8");
const original = parseFormTemplateDefinition(fixture);
let moved: FormTemplateDefinition;
const dateKeys = ["bride_date_of_birth", "groom_date_of_birth"];
const answers = {
  bride_nationality: "filipino", groom_nationality: "filipino", bride_civil_status: "single", groom_civil_status: "single",
  event_date: "2027-02-01", event_place: "Legazpi City, Albay", bride_date_of_birth: "2007-01-01", groom_date_of_birth: "2004-01-01",
  account_party_role: "Bride", subjects: ["Bride", "Groom"].map(role => ({ role, firstName: "Ana", middleName: "Santos", lastName: "Cruz", suffix: "", sex: role === "Bride" ? "female" : "male" })),
};

beforeAll(async () => {
  await db.exec(`create table form_templates(id uuid primary key default gen_random_uuid(),template_key text,active_version_id uuid,updated_at timestamptz);
    create table form_template_versions(id uuid primary key default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);
    insert into form_templates(template_key) values('marriage_license');`);
  await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$1::jsonb from form_templates", [JSON.stringify(original)]);
  await db.exec("update form_templates set active_version_id=(select id from form_template_versions)");
  await db.exec(migration);
  const { rows } = await db.query<{ definition: unknown }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id");
  moved = parseFormTemplateDefinition(rows[0].definition);
}, 30_000);
afterAll(() => db.close());

it("moves the required birth-date fields without changing the age rules or input keys", () => {
  expect(fieldsForStep(moved, "case").some(field => dateKeys.includes(field.key))).toBe(false);
  const dates = fieldsForStep(moved, "details").filter(field => dateKeys.includes(field.key));
  expect(dates).toEqual(fieldsForStep(original, "case").filter(field => dateKeys.includes(field.key)));
  expect(moved.derivedAnswers).toEqual(original.derivedAnswers);
  expect(fieldsForStep(moved, "details").map(field => field.key)).toEqual([
    "account_party_role", "subjects", ...dateKeys, "contact_number",
  ]);
});

it("keeps age validation and consent/advice calculations working on the moved dates", () => {
  expect(validateTemplateAnswers(moved, answers, "2026-11-14")).toEqual({ success: true });
  expect(deriveTemplateAnswers(moved, answers, "2026-11-14")).toMatchObject({ bride_age_bracket: "18_20", groom_age_bracket: "21_24" });
  for (const field of dateKeys) {
    expect(validateTemplateAnswers(moved, { ...answers, [field]: "2015-01-01", bride_age_bracket: "25_plus", groom_age_bracket: "25_plus" }, "2026-11-14").success).toBe(false);
    expect(validateTemplateAnswers(moved, { ...answers, [field]: "" }, "2026-11-14").success).toBe(false);
  }
});

it("preserves saved answers and the staff walk-in birth dates", () => {
  expect(flattenTemplateAnswers(moved, canonicalizeTemplateAnswers(moved, answers)))
    .toEqual(flattenTemplateAnswers(original, canonicalizeTemplateAnswers(original, answers)));
  const walkIn = walkInCaseForService(moved, "MARRIAGE_LICENSE").definition;
  for (const key of dateKeys) expect(walkIn.sections.flatMap(section => section.fields).some(field => field.key === key)).toBe(true);
});

it("publishes a new version once and preserves the previous version", async () => {
  await db.exec(migration);
  const { rows } = await db.query<{ version: number; definition: unknown }>("select version,definition from form_template_versions order by version");
  expect(rows).toHaveLength(2);
  expect(rows[0].definition).toEqual(original);
});
