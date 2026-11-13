import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import fixture from "./fixtures/ra9255-charter.json";
import { fieldsForStep, parseFormTemplateDefinition } from "./form-template.utils";
import { walkInCaseForService } from "../requests/walk-in-legitimation";
import { surnameChangeRequirementName } from "../services/surname-change";

const migration = readFileSync(new URL("../../../supabase/migrations/20261113050921_move_surname_change_birth_details.sql", import.meta.url), "utf8");

it("moves surname-change birth fields to details once, preserving validation and older forms", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table form_templates(id uuid primary key default gen_random_uuid(),active_version_id uuid,updated_at timestamptz);
      create table form_template_versions(id uuid primary key default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);
      create table service_form_templates(service_code text,template_id uuid);
      insert into form_templates default values;
      insert into service_form_templates select 'RA9255_SURNAME',id from form_templates;
    `);
    await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$1::jsonb from form_templates", [JSON.stringify(fixture.definition)]);
    await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
    await db.exec(migration);
    await db.exec(migration);
    const versions = (await db.query<{definition: unknown}>("select definition from form_template_versions order by version")).rows;
    expect(versions).toHaveLength(2);
    expect(versions[0].definition).toEqual(fixture.definition);
    const definition = parseFormTemplateDefinition(versions[1].definition);
    expect(fieldsForStep(definition, "case").map(f => f.key)).not.toContain("event_date");
    expect(fieldsForStep(definition, "case").map(f => f.key)).not.toContain("event_place");
    expect(fieldsForStep(definition, "details").map(f => f.key)).toEqual(["subjects", "event_date", "event_place", "contact_number"]);
    expect(fieldsForStep(definition, "details").find(f => f.key === "event_date")).toMatchObject({ required: true, dateDirection: "past" });
    expect(fieldsForStep(definition, "details").find(f => f.key === "event_date")?.helpText).toBeUndefined();
    const walkIn = walkInCaseForService(definition, "RA9255_SURNAME").definition;
    expect(fieldsForStep(walkIn, "details").filter(f => ["event_date", "event_place"].includes(f.key))).toHaveLength(2);
    const affidavit = fixture.requirements.find(r => r.requirement_name.startsWith("Subscribed Affidavit"))!;
    expect(surnameChangeRequirementName(affidavit.requirement_name, "RA9255_SURNAME", "2010-01-01", "2026-11-13")).toContain("notarized attestation");
  } finally {
    await db.close();
  }
}, 30_000);
