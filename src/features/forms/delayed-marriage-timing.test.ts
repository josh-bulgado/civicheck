import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseFormTemplateDefinition, evaluateTemplateEventTiming, validateTemplateAnswers, fieldsForStep, isFieldVisible } from "./form-template.utils";
import type { FormTemplateDefinition } from "./form-template.types";

const db = new PGlite();
const migration = readFileSync(new URL("../../../supabase/migrations/20261103152722_delayed_marriage_license_basis.sql", import.meta.url), "utf8");
let definition: FormTemplateDefinition;

beforeAll(async () => {
  await db.exec(`create table form_templates(id int primary key,template_key text,active_version_id uuid,updated_at timestamptz);
    create table form_template_versions(id uuid default gen_random_uuid(),template_id int,version int,status text,definition jsonb,published_at timestamptz);`);
  const basis = { key: "marriage_license_basis", type: "select", label: "Was a marriage license issued for this marriage?", required: true,
    options: [{ value: "with_license", label: "With license" }, { value: "article_34", label: "Article 34" }, { value: "pd_1083", label: "P.D. 1083" }] };
  const original = { schemaVersion: 1, sections: [{ key: "case", step: "case", title: "Case details", fields: [
    { key: "registration_type", type: "select", label: "Registration type", required: true,
      options: [{ value: "delayed", label: "Delayed" }, { value: "reconstruction", label: "Reconstruction" }] },
    { key: "has_children", type: "select", label: "Children?", required: true,
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
      visibleWhen: { field: "registration_type", operator: "equals", value: "reconstruction" } },
    { key: "event_date", type: "date", label: "Date of marriage", required: true, dateDirection: "past" },
  ] }, { key: "details", step: "details", title: "Names", fields: [
    { key: "subjects", type: "person_group", label: "Names", required: false },
  ] }], eventTiming: { triggerField: "event_date", windowDays: 15, mismatch: "inside_window",
    behavior: "redirect_confirm", targetServiceCode: "MARRIAGE_ONTIME", title: "On time", description: "Use on-time registration" } };
  for (const [id, key, form] of [[1, "marriage_delayed", original], [2, "marriage_ontime", { schemaVersion: 1, sections: [{ key: "case", step: "case", fields: [basis] }] }]] as const) {
    await db.query("insert into form_templates(id,template_key) values ($1,$2)", [id, key]);
    await db.query("insert into form_template_versions(template_id,version,status,definition) values ($1,1,'published',$2)", [id, JSON.stringify(form)]);
  }
  await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
  await db.exec(migration);
  const { rows } = await db.query<{ definition: unknown }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id where t.id=1");
  definition = parseFormTemplateDefinition(rows[0].definition);
}, 30_000);
afterAll(() => db.close());

describe("delayed marriage license question and routing", () => {
  it("shows the license question only for delayed registration and children only for reconstruction", () => {
    const fields = (registration_type: string) => fieldsForStep(definition, "case")
      .filter((f) => isFieldVisible(f, { registration_type })).map((f) => f.key);
    expect(fields("delayed")).toEqual(["registration_type", "marriage_license_basis", "event_date"]);
    expect(fields("reconstruction")).toEqual(["registration_type", "has_children", "event_date"]);
  });
  it.each([
    ["with_license", "2026-10-19", true], ["with_license", "2026-10-18", false],
    ["article_34", "2026-10-04", true], ["article_34", "2026-10-03", false],
    ["pd_1083", "2026-10-04", true], ["pd_1083", "2026-10-03", false],
  ])("checks %s at %s on both client and server", (marriage_license_basis, event_date, onTime) => {
    const answers = { registration_type: "delayed", marriage_license_basis, event_date };
    expect(evaluateTemplateEventTiming(definition, answers, "2026-11-03")?.evaluation.mismatched).toBe(onTime);
    expect(validateTemplateAnswers(definition, answers, "2026-11-03").success).toBe(!onTime);
  });
  it("waits for the basis answer and still requires it on submission", () => {
    const answers = { registration_type: "delayed", event_date: "2026-10-20" };
    expect(evaluateTemplateEventTiming(definition, answers, "2026-11-03")).toBeNull();
    expect(validateTemplateAnswers(definition, answers, "2026-11-03").success).toBe(false);
  });
  it("does not route reconstruction even with a stale license answer", () => {
    const answers = { registration_type: "reconstruction", marriage_license_basis: "article_34", has_children: "yes", event_date: "2026-11-01" };
    expect(evaluateTemplateEventTiming(definition, answers, "2026-11-03")).toBeNull();
    expect(validateTemplateAnswers(definition, answers, "2026-11-03").success).toBe(true);
  });
  it("preserves old versions and is safe to run again", async () => {
    await db.exec(migration);
    const { rows } = await db.query<{ count: number }>("select count(*)::int as count from form_template_versions where template_id=1");
    expect(rows[0].count).toBe(2);
  });
});
