import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { parseFormTemplateDefinition, validateTemplateAnswers } from "~/features/forms/form-template.utils";
import { walkInCaseForService } from "~/features/requests/walk-in-legitimation";

const db = new PGlite();
const migration = readFileSync(new URL("../../../supabase/migrations/20261111090304_marriage_account_party.sql", import.meta.url), "utf8");
const services = [
  ["marriage_license", "MARRIAGE_LICENSE"],
  ["marriage_ontime", "MARRIAGE_ONTIME"],
  ["marriage_delayed", "MARRIAGE_DELAYED"],
];
const original = {
  schemaVersion: 1,
  sections: [
    { key: "case", step: "case", title: "Case details", fields: [] },
    { key: "details", step: "details", title: "Your details", fields: [
      { key: "subjects", type: "person_group", label: "People", required: true },
    ] },
  ],
};

beforeAll(async () => {
  await db.exec(`
    create table form_templates(id uuid primary key default gen_random_uuid(), template_key text, active_version_id uuid, updated_at timestamptz);
    create table form_template_versions(id uuid primary key default gen_random_uuid(), template_id uuid, version int, status text, definition jsonb, published_at timestamptz);
  `);
  for (const [key] of services) {
    await db.query("insert into form_templates(template_key) values ($1)", [key]);
    await db.query(`insert into form_template_versions(template_id,version,status,definition)
      select id,1,'published',$2::jsonb from form_templates where template_key=$1`, [key, JSON.stringify(original)]);
    await db.query(`update form_templates t set active_version_id=v.id
      from form_template_versions v where v.template_id=t.id and t.template_key=$1`, [key]);
  }
  await db.exec(migration);
}, 30_000);
afterAll(() => db.close());

it.each(services)("adds the online role question for %s and excludes it from walk-in intake", async (key, serviceCode) => {
  const { rows } = await db.query<{ definition: unknown; version: number }>(`select v.definition,v.version
    from form_templates t join form_template_versions v on v.id=t.active_version_id where template_key=$1`, [key]);
  const definition = parseFormTemplateDefinition(rows[0].definition);
  expect(rows[0].version).toBe(2);
  const fields = definition.sections.flatMap((s) => s.fields);
  const role = fields.find((f) => f.key === "account_party_role")!;
  expect(role.required).toBe(true);
  expect(role.label).toBe(key === "marriage_license" ? "Are you the bride or groom?" : "Are you the husband or wife?");
  expect(role.options?.map((o) => o.label)).toEqual(key === "marriage_license" ? ["Bride", "Groom"] : ["Wife", "Husband"]);
  const subjects = ["Bride", "Groom"].map((role) => ({ role, firstName: "Ana", middleName: "Santos", lastName: "Reyes", suffix: "", sex: role === "Bride" ? "female" : "male" }));
  expect(validateTemplateAnswers(definition, { subjects }).success).toBe(false);
  expect(validateTemplateAnswers(definition, { account_party_role: "Bride", subjects }).success).toBe(true);
  const walkIn = walkInCaseForService(definition, serviceCode).definition;
  expect(walkIn.sections.flatMap((s) => s.fields).some((f) => f.key === "account_party_role")).toBe(false);
  expect(validateTemplateAnswers(walkIn, { subjects }).success).toBe(true);
});

it("preserves prior versions and is safe to rerun", async () => {
  await db.exec(migration);
  const { rows } = await db.query<{ count: number }>("select count(*)::int as count from form_template_versions");
  expect(rows[0].count).toBe(6);
  const prior = await db.query<{ definition: unknown }>("select definition from form_template_versions where version=1");
  expect(prior.rows.every((row) => JSON.stringify(row.definition) === JSON.stringify(prior.rows[0].definition))).toBe(true);
  expect(prior.rows[0].definition).toEqual(original);
});
