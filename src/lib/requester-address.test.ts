import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addressAreas, addressCities, addressDescendants, formatRequesterAddress } from "./requester-address";
import { formTemplateDefinitionSchema, type FormTemplateDefinition } from "~/features/forms/form-template.types";
import { canonicalizeTemplateAnswers, validateTemplateAnswers } from "~/features/forms/form-template.utils";
import { countryOptions } from "./countries";

const migration = readFileSync(new URL("../../supabase/migrations/20261101000541_ctc_structured_philippine_address.sql", import.meta.url), "utf8");

describe("CTC Local address migration", () => {
  const db = new PGlite();
  let definition: FormTemplateDefinition;
  const original = {
    schemaVersion: 1,
    sections: [{
      key: "details", step: "details", title: "Requester", fields: [
        { key: "origin", type: "select", label: "Origin", required: true,
          options: [{ value: "local", label: "Local" }, { value: "abroad", label: "Abroad" }] },
        { key: "subjects", type: "person_group", label: "Owner", required: false },
        { key: "requester_address", type: "text", label: "Address", required: true },
      ],
    }],
  };

  beforeAll(async () => {
    await db.exec(`
      create table form_templates (
        id uuid primary key default gen_random_uuid(), template_key text,
        active_version_id uuid, updated_at timestamptz
      );
      create table form_template_versions (
        id uuid primary key default gen_random_uuid(), template_id uuid,
        version integer, status text, definition jsonb, published_at timestamptz
      );
      insert into form_templates (template_key) values ('ctc_issuance');
    `);
    await db.query(`insert into form_template_versions (template_id, version, definition)
      select id, 1, $1::jsonb from form_templates`, [JSON.stringify(original)]);
    await db.exec(`update form_templates set active_version_id = (select id from form_template_versions);`);
    await db.exec(migration);
    const result = await db.query<{ definition: unknown }>(`
      select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id
    `);
    definition = formTemplateDefinitionSchema.parse(result.rows[0].definition);
  }, 30_000);
  afterAll(() => db.close());

  it("requires local location parts, allows an empty street, and rejects mismatched cities", () => {
    expect(validateTemplateAnswers(definition, { origin: "local", subjects: [] }).success).toBe(false);
    const local = {
      origin: "local", subjects: [], requester_province: "Albay",
      requester_city: "City of Legazpi", requester_barangay: "Rawis",
    };
    expect(validateTemplateAnswers(definition, local)).toEqual({ success: true });
    expect(validateTemplateAnswers(definition, { ...local, requester_barangay: "" }).success).toBe(false);
    expect(validateTemplateAnswers(definition, { ...local, requester_city: "City of Manila" }).success).toBe(false);
    expect(canonicalizeTemplateAnswers(definition, { ...local, requester_address: "Old full address" }))
      .not.toHaveProperty("requester_address");
  });

  it("keeps Abroad's full address and prunes local parts", () => {
    expect(validateTemplateAnswers(definition, { origin: "abroad", subjects: [] }).success).toBe(false);
    const answers = canonicalizeTemplateAnswers(definition, {
      origin: "abroad", subjects: [], requester_address: "123 Example Road, London",
      requester_province: "Albay", requester_city: "City of Legazpi",
    });
    expect(validateTemplateAnswers(definition, answers)).toEqual({ success: true });
    expect(answers).not.toHaveProperty("requester_province");
    expect(formatRequesterAddress(answers)).toBe("123 Example Road, London");
  });

  it("preserves old versions and is safe to rerun", async () => {
    await db.exec(migration);
    const versions = await db.query<{ version: number; definition: unknown }>(
      "select version, definition from form_template_versions order by version");
    expect(versions.rows).toHaveLength(2);
    expect(versions.rows[0].definition).toEqual(original);
  });

  it("reuses local fields for email inquiry without requiring an origin answer", async () => {
    const emailMigration = readFileSync(new URL("../../supabase/migrations/20261104000915_email_inquiry_local_address.sql", import.meta.url), "utf8");
    const emailOriginal = {
      schemaVersion: 1,
      sections: [{ key: "requester", step: "details", title: "Requester", fields: [
        { key: "subjects", type: "person_group", label: "Owner", required: false },
        { key: "requester_first_name", type: "text", label: "First name", required: true },
        { key: "requester_address", type: "text", label: "Address", required: true },
      ] }],
    };
    await db.exec(`
      create table service_form_templates (service_code text, template_id uuid);
      insert into form_templates (template_key) values ('email_inquiry');
      insert into service_form_templates select 'EMAIL_INQUIRY', id from form_templates where template_key = 'email_inquiry';
    `);
    await db.query(`insert into form_template_versions(template_id, version, definition)
      select id, 1, $1::jsonb from form_templates where template_key = 'email_inquiry'`, [JSON.stringify(emailOriginal)]);
    await db.exec(`update form_templates t set active_version_id = v.id
      from form_template_versions v where v.template_id = t.id and t.template_key = 'email_inquiry'`);
    const ctcBefore = await db.query("select active_version_id from form_templates where template_key = 'ctc_issuance'");
    await db.exec(emailMigration);
    const result = await db.query<{ definition: unknown }>(`select v.definition from form_templates t
      join form_template_versions v on v.id = t.active_version_id where t.template_key = 'email_inquiry'`);
    const email = formTemplateDefinitionSchema.parse(result.rows[0].definition);
    expect(email.sections[0].fields.map((field) => field.key)).toEqual([
      "subjects", "requester_first_name", "requester_province", "requester_city", "requester_barangay", "requester_street",
    ]);
    const answers = { subjects: [], requester_first_name: "Juan", requester_province: "Albay",
      requester_city: "City of Legazpi", requester_barangay: "Rawis" };
    expect(validateTemplateAnswers(email, answers)).toEqual({ success: true });
    for (const key of ["requester_province", "requester_city", "requester_barangay"]) {
      expect(validateTemplateAnswers(email, { ...answers, [key]: "" }).success).toBe(false);
    }
    expect(validateTemplateAnswers(email, { ...answers, requester_city: "City of Manila" }).success).toBe(false);
    const cleaned = canonicalizeTemplateAnswers(email, { ...answers, requester_address: "Old address" });
    expect(cleaned).not.toHaveProperty("requester_address");
    expect(formatRequesterAddress(cleaned)).toBe("Rawis, Legazpi City, Albay");
    await db.exec(emailMigration);
    const versions = await db.query<{ definition: unknown }>(`select v.definition from form_template_versions v
      join form_templates t on t.id = v.template_id where t.template_key = 'email_inquiry' order by v.version`);
    expect(versions.rows).toHaveLength(2);
    expect(versions.rows[0].definition).toEqual(emailOriginal);
    expect(await db.query("select active_version_id from form_templates where template_key = 'ctc_issuance'"))
      .toEqual(ctcBefore);
  });

  it("upgrades Abroad, preserves Local, and prunes the other branch's address", async () => {
    const abroadMigration = readFileSync(new URL("../../supabase/migrations/20261101002733_ctc_abroad_structured_address.sql", import.meta.url), "utf8");
    const isolated = new PGlite();
    try {
      await isolated.exec(`
        create table form_templates (id uuid primary key default gen_random_uuid(), template_key text, active_version_id uuid, updated_at timestamptz);
        create table form_template_versions (id uuid primary key default gen_random_uuid(), template_id uuid, version integer, status text, definition jsonb, published_at timestamptz);
        insert into form_templates (template_key) values ('ctc_issuance');
      `);
      await isolated.query("insert into form_template_versions(template_id,version,definition) select id,1,$1::jsonb from form_templates", [JSON.stringify(definition)]);
      await isolated.exec("update form_templates set active_version_id=(select id from form_template_versions)");
      await isolated.exec(abroadMigration);
      const result = await isolated.query<{ definition: unknown }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id");
      const upgraded = formTemplateDefinitionSchema.parse(result.rows[0].definition);
      const overseas = {
        origin: "abroad", subjects: [], requester_country: "Canada",
        requester_address_line1: "10 Example Street", requester_overseas_city: "Toronto",
        requester_postal_code: "M5V 1A1",
      };
      expect(validateTemplateAnswers(upgraded, overseas)).toEqual({ success: true });
      for (const key of ["requester_country", "requester_address_line1", "requester_overseas_city"]) {
        expect(validateTemplateAnswers(upgraded, { ...overseas, [key]: "" }).success).toBe(false);
      }
      expect(validateTemplateAnswers(upgraded, { ...overseas, requester_country: "Invalid country" }).success).toBe(false);
      const cleaned = canonicalizeTemplateAnswers(upgraded, {
        ...overseas, requester_province: "Albay", requester_city: "City of Legazpi",
        requester_barangay: "Rawis", requester_street: "Stale local street",
      });
      expect(cleaned).not.toHaveProperty("requester_province");
      expect(formatRequesterAddress(cleaned)).toBe("10 Example Street, Toronto, M5V 1A1, Canada");
      const local = canonicalizeTemplateAnswers(upgraded, {
        ...overseas, origin: "local", requester_province: "Albay",
        requester_city: "City of Legazpi", requester_barangay: "Rawis",
      });
      expect(local).not.toHaveProperty("requester_country");
      expect(validateTemplateAnswers(upgraded, local)).toEqual({ success: true });
      expect(formatRequesterAddress(local)).toBe("Rawis, Legazpi City, Albay");
      await isolated.exec(abroadMigration);
      const versions = await isolated.query<{ definition: unknown }>("select definition from form_template_versions order by version");
      expect(versions.rows).toHaveLength(2);
      expect(versions.rows[0].definition).toEqual(definition);
    } finally {
      await isolated.close();
    }
  }, 30_000);
});

describe("Philippine address lookup and formatting", () => {
  it("offers a complete searchable country list", () => {
    expect(countryOptions.length).toBeGreaterThan(240);
    expect(countryOptions.some((country) => country.code === "PH")).toBe(true);
    expect(countryOptions.some((country) => country.name === "Canada")).toBe(true);
  });
  it("covers Metro Manila, provinces and independent cities", () => {
    expect(addressCities("Albay").some((city) => city.name === "City of Legazpi")).toBe(true);
    expect(addressCities("Metro Manila").some((city) => city.name.includes("Quezon"))).toBe(true);
    expect(addressAreas.some((area) => area.name.includes("Independent cities"))).toBe(true);
    expect(addressDescendants("province")).toEqual(["requester_city", "requester_barangay"]);
    expect(addressDescendants("city")).toEqual(["requester_barangay"]);
  });

  it("loads barangays from the bundled dataset for a selected city", async () => {
    const { philippines } = await import("@ianlabicani/geoph-lite");
    const legazpi = addressCities("Albay").find((city) => city.name === "City of Legazpi")!;
    const barangays = await philippines.barangays(legazpi.code);
    expect(barangays.some((barangay) => barangay.name.includes("Rawis"))).toBe(true);
    expect(barangays.length).toBeGreaterThan(1);
  });

  it("prints local components and preserves legacy addresses", () => {
    expect(formatRequesterAddress({
      requester_province: "Albay", requester_city: "City of Legazpi",
      requester_barangay: "Rawis", requester_street: "12 Example Street",
    })).toBe("12 Example Street, Rawis, Legazpi City, Albay");
    expect(formatRequesterAddress({ requester_address: "Old free-text address" })).toBe("Old free-text address");
    const area = addressAreas.find((area) => area.name.includes("Independent cities"))!;
    expect(formatRequesterAddress({ requester_province: area.name, requester_city: area.cities[0].name, requester_barangay: "Example" }))
      .toBe(`Example, ${area.cities[0].name.replace(/^City of (.+)$/, "$1 City")}`);
  });
});
