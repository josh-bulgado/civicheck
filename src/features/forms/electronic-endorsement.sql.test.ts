import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, expect, it } from "vitest";
import { parseFormTemplateDefinition, fieldsForStep, conditionMatches, validateTemplateAnswers } from "./form-template.utils";

const db = new PGlite();
const migration = readFileSync(new URL("../../../supabase/migrations/20261106074138_electronic_endorsement_requester_owner.sql", import.meta.url), "utf8");
afterAll(() => db.close());

it("publishes requester and owner sections with record-specific fields, preserving old versions", async () => {
  const field = (key: string, type = "text") => ({ key, type, label: key, required: true });
  const original = { schemaVersion: 1, sections: [
    { key: "case", step: "case", title: "Case", fields: [field("endorsement_type"), field("record_type"), field("event_date", "date"), field("event_place"), field("reference_number")] },
    { key: "details", step: "details", title: "Details", fields: [field("subjects", "person_group")] },
  ] };
  const ownerFields = [field("subjects", "person_group"), { ...field("wife_maiden_name"), visibleWhen: { field: "record_type", operator: "equals", value: "marriage" } }];
  for (const record of ["birth", "death", "marriage"]) {
    for (const part of ["date", "place"]) ownerFields.push({
      ...field(`${record === "birth" ? "event" : record}_${part}`, part === "date" ? "date" : "text"),
      label: `${part === "date" ? "Date" : "Place"} of ${record}`,
      visibleWhen: { field: "record_type", operator: "equals", value: record },
    });
  }
  const reference = { schemaVersion: 1, sections: [
    { key: "details_requester", step: "details", title: "Requester", fields: [field("requester_first_name"), {
      ...field("requester_relationship", "select"), helpText: "CTC-only authorization requirements",
      options: [{ value: "owner", label: "Owner" }, { value: "representative", label: "Authorized representative" }],
    }, field("purpose_of_request"), field("contact_number", "phone")] },
    { key: "details", step: "details", title: "Owner", fields: [...ownerFields, field("mother_maiden_name")] },
  ] };
  await db.exec(`create table form_templates(id uuid primary key default gen_random_uuid(),template_key text,active_version_id uuid,updated_at timestamptz);
    create table form_template_versions(id uuid primary key default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);`);
  for (const [key, definition] of [["elec_endorsement", original], ["ctc_issuance", reference]] as const) {
    await db.query("insert into form_templates(template_key) values($1)", [key]);
    await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$2::jsonb from form_templates where template_key=$1", [key, JSON.stringify(definition)]);
  }
  await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
  await db.exec(migration);
  const { rows } = await db.query<{ definition: unknown }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id where t.template_key='elec_endorsement'");
  const result = parseFormTemplateDefinition(rows[0].definition);
  expect(fieldsForStep(result, "case").map(f => f.key)).toEqual(["endorsement_type", "record_type", "reference_number"]);
  expect(result.sections.map(s => s.title)).toEqual(["Case", "Requester's Information", "Owner's Information"]);
  expect(fieldsForStep(result, "details").some(f => ["purpose_of_request", "mother_maiden_name"].includes(f.key))).toBe(false);
  expect(fieldsForStep(result, "details").find(f => f.key === "requester_relationship")?.helpText).toContain("Staff will verify");
  for (const record of ["birth", "death", "marriage"]) {
    const visible = result.sections[2].fields.filter(f => !f.visibleWhen || conditionMatches(f.visibleWhen, { record_type: record }));
    expect(visible.filter(f => f.type === "date").map(f => f.label)).toEqual([`Date of ${record}`]);
    expect(visible.filter(f => f.key.endsWith("_place")).map(f => f.label)).toEqual([`Place of ${record}`]);
  }
  await db.exec(migration);
  const versions = await db.query<{ definition: unknown }>("select definition from form_template_versions v join form_templates t on t.id=v.template_id where t.template_key='elec_endorsement' order by version");
  expect(versions.rows).toHaveLength(2);
  expect(versions.rows[0].definition).toEqual(original);

  const removeRequester = readFileSync(new URL("../../../supabase/migrations/20261112233624_remove_electronic_endorsement_requester.sql", import.meta.url), "utf8");
  await db.exec(removeRequester);
  await db.exec(removeRequester);
  const updated = await db.query<{ definition: unknown }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id where t.template_key='elec_endorsement'");
  expect(parseFormTemplateDefinition(updated.rows[0].definition)).toEqual({
    ...result, sections: result.sections.filter(section => section.key !== "details_requester"),
  });
  const history = await db.query<{ definition: unknown }>("select definition from form_template_versions v join form_templates t on t.id=v.template_id where t.template_key='elec_endorsement' order by version");
  expect(history.rows).toHaveLength(3);
  expect(history.rows[0].definition).toEqual(original);
  expect(parseFormTemplateDefinition(history.rows[1].definition)).toEqual(result);
  const ctc = await db.query<{ definition: unknown }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id where t.template_key='ctc_issuance'");
  expect(ctc.rows[0].definition).toEqual(reference);

  const addLateRegistration = readFileSync(new URL("../../../supabase/migrations/20261112235135_electronic_endorsement_late_registration.sql", import.meta.url), "utf8");
  await db.exec(addLateRegistration);
  await db.exec(addLateRegistration);
  const lateResult = await db.query<{ definition: unknown }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id where t.template_key='elec_endorsement'");
  const lateDefinition = parseFormTemplateDefinition(lateResult.rows[0].definition);
  const lateFields = fieldsForStep(lateDefinition, "details").filter(field => field.key.startsWith("registered_late"));
  expect(lateFields.map(field => field.key)).toEqual(["registered_late", "registered_late_when"]);
  expect(lateFields[0].visibleWhen).toBeUndefined();
  const questions = { ...lateDefinition, sections: [{ key: "details", step: "details" as const, title: "Details", fields: lateFields }] };
  for (const record_type of ["birth", "death", "marriage"]) {
    const key = record_type === "birth" ? "event_date" : `${record_type}_date`;
    const answers = { record_type, [key]: "2000-01-01" };
    expect(validateTemplateAnswers(questions, { ...answers, registered_late: "no" }, "2026-11-13").success).toBe(true);
    expect(validateTemplateAnswers(questions, { ...answers, registered_late: "yes" }, "2026-11-13").success).toBe(false);
    expect(validateTemplateAnswers(questions, { ...answers, registered_late: "yes", registered_late_when: "2000-02-01" }, "2026-11-13").success).toBe(true);
    expect(validateTemplateAnswers(questions, { ...answers, registered_late: "yes", registered_late_when: "1999-01-01" }, "2026-11-13").success).toBe(false);
  }
}, 30_000);
