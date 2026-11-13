import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import fixture from "./fixtures/petition-charter.json";
import otherCertificate from "../requests/fixtures/other-certificate-walk-in-form.json";
import { canonicalizeTemplateAnswers, fieldsForStep, parseFormTemplateDefinition } from "./form-template.utils";
import { validateDateAnswer } from "./date-validation";

it("removes the duplicate current name and keeps the owner heading independent of stale record type", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table form_templates(id uuid primary key default gen_random_uuid(),template_key text,active_version_id uuid,updated_at timestamptz);
      create table form_template_versions(id uuid primary key default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);
      create table service_form_templates(service_code text,template_id uuid);
      insert into form_templates(template_key) values('ra9048_10172');`);
    await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$1::jsonb from form_templates", [JSON.stringify(fixture.definition)]);
    await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
    const migrate = async (name: string) => db.exec(readFileSync(new URL(`../../../supabase/migrations/${name}.sql`, import.meta.url), "utf8"));
    await migrate("20261113063707_petition_primary_selection");
    await migrate("20261113075722_petition_charter_fields_only");
    await migrate("20261113083302_move_petition_record_details");
    await migrate("20261113091243_remove_duplicate_petition_first_name");
    await migrate("20261113091243_remove_duplicate_petition_first_name");
    const { rows } = await db.query<{definition: unknown}>("select definition from form_template_versions order by version");
    expect(rows).toHaveLength(5);
    expect(rows[0].definition).toEqual(fixture.definition);
    const definition = parseFormTemplateDefinition(rows[4].definition);
    const caseKeys = fieldsForStep(definition, "case").map(f => f.key);
    expect(caseKeys).not.toContain("current_first_name");
    expect(caseKeys).toContain("new_first_name");
    const names = fieldsForStep(definition, "details").filter(f => f.type === "person_group");
    expect(names).toHaveLength(1);
    expect(names[0].required).toBe(true);
    const staleDraft = { primary_petition: "change_first_name", record_type: "death" };
    const rule = names[0].labelByAnswer!;
    expect(rule.labels[staleDraft[rule.field as keyof typeof staleDraft]]).toBe("Person named on the birth certificate");
    expect(rule.labels.correct_other).toBe("Person named on the record");

    // A separate source template verifies that the migration copies the shared controls.
    const motherFields = ["first", "middle", "last"].map(part => ({
      key: `mother_${part}_name`, type: "text", label: `Mother's ${part} name`,
      required: true, inline: true,
      ...(part === "middle" ? { noneLabel: "No middle name" } : {}),
      visibleWhen: { field: "record_type", operator: "equals", value: "birth" },
    }));
    await db.exec("insert into form_templates(template_key) values('ctc_issuance')");
    await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$1::jsonb from form_templates where template_key='ctc_issuance'", [JSON.stringify({ sections: [{ fields: motherFields }] })]);
    await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id and t.template_key='ctc_issuance'; insert into service_form_templates select 'CTC-LOCAL',id from form_templates where template_key='ctc_issuance'");
    await migrate("20261113092352_petition_record_and_parent_details");
    await migrate("20261113092352_petition_record_and_parent_details");
    const updated = await db.query<{ definition: unknown }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id where t.template_key='ra9048_10172'");
    const latest = parseFormTemplateDefinition(updated.rows[0].definition);
    const details = fieldsForStep(latest, "details");
    expect(details.map(f => f.key)).toEqual(["subjects", "event_date", "event_place", "mother_first_name", "mother_middle_name", "mother_last_name", "father_name"]);
    for (const primary of ["change_first_name", "correct_sex", "correct_birth_day_month"]) {
      expect(details.find(f => f.key === "event_date")?.labelByAnswer?.labels[primary]).toBe("Date of Birth");
      expect(details.find(f => f.key === "event_place")?.labelByAnswer?.labels[primary]).toBe("Place of Birth");
    }
    expect(details.find(f => f.key === "mother_middle_name")?.noneLabel).toBe("No middle name");
    expect(details.find(f => f.key === "father_name")?.required).toBe(false);
    const versions = await db.query<{ count: number }>("select count(*)::int as count from form_template_versions v join form_templates t on t.id=v.template_id where t.template_key='ra9048_10172'");
    expect(versions.rows[0].count).toBe(6);
    await migrate("20261113101042_petition_late_registration");
    await migrate("20261113101042_petition_late_registration");
    const lateResult = await db.query<{ definition: unknown }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id where t.template_key='ra9048_10172'");
    const lateDefinition = parseFormTemplateDefinition(lateResult.rows[0].definition);
    const lateDetails = fieldsForStep(lateDefinition, "details");
    expect(lateDetails.slice(1,5).map(f => f.key)).toEqual(["event_date", "event_place", "registered_late", "registered_late_when"]);
    const registration = lateDetails.find(f => f.key === "registered_late_when")!;
    expect(registration.allowEstimate).toBe(true);
    expect(registration.required).toBe(true);
    const lateAnswers = { primary_petition: "change_first_name", change_first_name: "yes", correct_other: "no", correct_sex: "no", correct_birth_day_month: "no", event_date: "2000-01-01", registered_late: "yes", registered_late_when: "2001-01-01" };
    expect(canonicalizeTemplateAnswers(lateDefinition, lateAnswers)).toMatchObject({registered_late: "yes", registered_late_when: "2001-01-01"});
    expect(canonicalizeTemplateAnswers(lateDefinition, {...lateAnswers, registered_late: "no"})).not.toHaveProperty("registered_late_when");
    expect(canonicalizeTemplateAnswers(lateDefinition, {...lateAnswers, primary_petition: "correct_other", change_first_name: "no", correct_other: "yes"})).not.toHaveProperty("registered_late");
    expect(validateDateAnswer(registration, "1999-01-01", lateAnswers, "2026-11-13")).not.toBe(true);
    expect(validateDateAnswer(registration, "Estimated: 2001", lateAnswers, "2026-11-13")).toBe(true);
    expect(validateDateAnswer(registration, "2027-01-01", lateAnswers, "2026-11-13")).not.toBe(true);
    const lateVersions = await db.query<{count: number}>("select count(*)::int as count from form_template_versions v join form_templates t on t.id=v.template_id where t.template_key='ra9048_10172'");
    expect(lateVersions.rows[0].count).toBe(7);
    await migrate("20261113102219_move_petition_late_registration_after_father");
    await migrate("20261113102219_move_petition_late_registration_after_father");
    const reordered = await db.query<{definition: unknown}>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id where t.template_key='ra9048_10172'");
    const reorderedDetails = fieldsForStep(parseFormTemplateDefinition(reordered.rows[0].definition), "details");
    expect(reorderedDetails.map(f => f.key)).toEqual(["subjects", "event_date", "event_place", "mother_first_name", "mother_middle_name", "mother_last_name", "father_name", "registered_late", "registered_late_when"]);
    expect(reorderedDetails.find(f => f.key === "registered_late_when")).toEqual(registration);
    const wifeFields = parseFormTemplateDefinition(otherCertificate).sections.flatMap(s => s.fields).filter(f => f.key.startsWith("wife_"));
    await db.exec("insert into form_templates(template_key) values('other_cert')");
    await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$1::jsonb from form_templates where template_key='other_cert'", [JSON.stringify({sections: [{fields: wifeFields}]})]);
    await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id and t.template_key='other_cert'; insert into service_form_templates select 'OTHER_CERT',id from form_templates where template_key='other_cert'");
    await migrate("20261113102757_petition_marriage_record_fields");
    await migrate("20261113102757_petition_marriage_record_fields");
    const marriageResult = await db.query<{definition: unknown}>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id where t.template_key='ra9048_10172'");
    const marriageDefinition = parseFormTemplateDefinition(marriageResult.rows[0].definition);
    expect(fieldsForStep(marriageDefinition, "details").slice(0,4).map(f => f.key)).toEqual(["subjects", "wife_first_name", "wife_middle_name", "wife_last_name"]);
    const marriageAnswers = {...lateAnswers, primary_petition:"correct_other", change_first_name:"no", correct_other:"yes", record_type:"marriage", wife_first_name:"Ana", wife_middle_name:"N/A", wife_last_name:"Cruz", mother_first_name:"Maria", father_name:"Juan"};
    const savedMarriage = canonicalizeTemplateAnswers(marriageDefinition, marriageAnswers);
    expect(savedMarriage).toMatchObject({wife_first_name:"Ana", wife_middle_name:"N/A", wife_last_name:"Cruz"});
    for (const key of ["mother_first_name", "father_name", "registered_late", "registered_late_when"]) expect(savedMarriage).not.toHaveProperty(key);
    const savedDeath = canonicalizeTemplateAnswers(marriageDefinition, {...marriageAnswers, record_type:"death"});
    expect(savedDeath).not.toHaveProperty("wife_first_name");
    await migrate("20261113103436_petition_marriage_late_registration");
    await migrate("20261113103436_petition_marriage_late_registration");
    const finalResult = await db.query<{definition: unknown}>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id where t.template_key='ra9048_10172'");
    const finalDefinition = parseFormTemplateDefinition(finalResult.rows[0].definition);
    for (const record_type of ["marriage", "death"]) {
      expect(canonicalizeTemplateAnswers(finalDefinition, {...marriageAnswers, record_type})).toMatchObject({registered_late:"yes", registered_late_when:"2001-01-01"});
      expect(canonicalizeTemplateAnswers(finalDefinition, {...marriageAnswers, record_type, registered_late:"no"})).not.toHaveProperty("registered_late_when");
    }
  } finally { await db.close(); }
}, 30_000);
