import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import fixture from "../forms/fixtures/petition-charter.json";
import { canonicalizeTemplateAnswers, flattenTemplateAnswers, parseFormTemplateDefinition, resolveCaseSelectorServiceCode } from "../forms/form-template.utils";
import { petitionCaseLayout, petitionDetailsLayout, petitionRecordType, petitionSelectionError, withPrimaryPetition } from "./petition-selection";
import { isRequirementApplicable } from "./service-utils";
import type { ServiceRequirement } from "~/features/admin/services/services.types";

const original = parseFormTemplateDefinition(fixture.definition);

it.each(["birth", "marriage", "death"])("uses %s event labels for clerical petitions", record_type => {
  const answers = { primary_petition: "correct_other", record_type };
  const fields = petitionDetailsLayout(original, "RA9048-CCE", answers).sections.flatMap(s => s.fields);
  const event = record_type[0].toUpperCase() + record_type.slice(1);
  expect(fields.find(f => f.key === "event_date")?.label).toBe(`Date of ${event}`);
  expect(fields.find(f => f.key === "event_place")?.label).toBe(`Place of ${event}`);
});

it("ignores stale marriage/death answers for birth-specific petitions", () => {
  const answers = { primary_petition: "change_first_name", record_type: "marriage" };
  expect(petitionRecordType(answers)).toBe("birth");
  const fields = petitionDetailsLayout(original, "RA9048-CFN", answers).sections.flatMap(s => s.fields);
  expect(fields.find(f => f.key === "event_date")?.label).toBe("Date of Birth");
});

it("uses the selected petition for its routing and requirements", () => {
  const primary = withPrimaryPetition({}, "correct_other");
  expect(petitionSelectionError(primary)).toBeNull();
  expect(resolveCaseSelectorServiceCode(original, primary)).toBe("RA9048-CCE");
  const names = (fixture.requirements as ServiceRequirement[]).filter(r => r.is_mandatory &&
    isRequirementApplicable(r, "RA9048-CCE", primary)).map(r => r.requirement_name);
  expect(names.some(name => name.startsWith("[Correction of Clerical Error]"))).toBe(true);
  expect(names.some(name => name.startsWith("[RA 10172") || name.startsWith("[Change of First Name]"))).toBe(false);
});

it("replaces old selections and rejects inconsistent petition answers", () => {
  const selected = withPrimaryPetition({ change_first_name: "yes", correct_sex: "yes" }, "change_first_name");
  expect(selected.correct_sex).toBe("no");
  expect(petitionSelectionError(selected)).toBeNull();
  expect(petitionSelectionError({ ...selected, correct_sex: "yes" })).not.toBeNull();
  const switched = withPrimaryPetition(selected, "correct_birth_day_month");
  expect(switched.change_first_name).toBe("no");
  expect(switched.correct_birth_day_month).toBe("yes");
});

it("removes unsupported questions and stale answers while preserving history and field order", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table form_templates(id uuid primary key default gen_random_uuid(),template_key text,active_version_id uuid,updated_at timestamptz);
      create table form_template_versions(id uuid primary key default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);
      insert into form_templates(template_key) values('ra9048_10172');`);
    await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$1::jsonb from form_templates", [JSON.stringify(fixture.definition)]);
    await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
    const migration = readFileSync(new URL("../../../supabase/migrations/20261113063707_petition_primary_selection.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec(migration);
    const charterMigration = readFileSync(new URL("../../../supabase/migrations/20261113075722_petition_charter_fields_only.sql", import.meta.url), "utf8");
    await db.exec(charterMigration);
    await db.exec(charterMigration);
    const versions = await db.query<{definition: unknown}>("select definition from form_template_versions order by version");
    expect(versions.rows).toHaveLength(3);
    expect(versions.rows[0].definition).toEqual(fixture.definition);
    const definition = parseFormTemplateDefinition(versions.rows[2].definition);
    const answers = { ...withPrimaryPetition({}, "correct_other"), has_additional_corrections: "yes", petitioner_relationship: "representative", first_name_ground: "habitual" };
    const saved = flattenTemplateAnswers(definition, canonicalizeTemplateAnswers(definition, answers));
    expect(saved).toMatchObject({ primary_petition: "correct_other", correct_sex: "no" });
    const keys = definition.sections.flatMap(s => s.fields.map(f => f.key));
    for (const key of ["first_name_ground", "petitioner_relationship", "registered_in_legazpi", "has_additional_corrections", "additional_corrections_for_review", "contact_number", "additional_notes"]) {
      expect(keys).not.toContain(key);
      expect(saved).not.toHaveProperty(key);
    }
    expect(keys).toContain("employment_status");
    for (const section of definition.sections) {
      const firstOptional = section.fields.findIndex(field => !field.required);
      if (firstOptional >= 0) expect(section.fields.slice(firstOptional).every(field => !field.required)).toBe(true);
    }
    const displayed = petitionCaseLayout(definition, "RA9048-CCE");
    expect(displayed.sections.flatMap(s => s.fields).some(f => f.key === "primary_petition")).toBe(false);
    expect(petitionCaseLayout(original, "LEGITIMATION")).toBe(original);
  } finally { await db.close(); }
}, 30_000);
