import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { parseFormTemplateDefinition, validateTemplateAnswers } from "~/features/forms/form-template.utils";
import { addressDescendants, formatOwnerAddress, formatRequesterAddress } from "./requester-address";

describe("CTC owner address", () => {
  it("moves and validates the address without changing the old version", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        create table form_templates (id uuid primary key default gen_random_uuid(), template_key text,
          active_version_id uuid, updated_at timestamptz);
        create table form_template_versions (id uuid primary key default gen_random_uuid(), template_id uuid,
          version integer, status text, definition jsonb, published_at timestamptz);
        insert into form_templates(template_key) values ('ctc_issuance');
      `);
      const original = { schemaVersion: 1, sections: [
        { key: "details_requester", title: "Requester", step: "details", fields: [
          ...["province", "city", "barangay"].map(level => ({ key: `requester_${level}`, type: "text",
            label: level, required: true, philippineAddressLevel: level })),
          { key: "requester_street", type: "text", label: "Street", required: false },
          { key: "purpose_of_request", type: "text", label: "Purpose", required: false },
        ] },
        { key: "details", title: "Owner", step: "details", fields: [
          { key: "subjects", type: "person_group", label: "Owner", required: false },
        ] },
      ] };
      await db.query(`insert into form_template_versions(template_id, version, status, definition)
        select id, 1, 'published', $1::jsonb from form_templates`, [JSON.stringify(original)]);
      await db.exec("update form_templates set active_version_id = (select id from form_template_versions)");
      await db.exec(readFileSync(new URL("../../supabase/migrations/20261115090000_ctc_owner_address.sql", import.meta.url), "utf8"));
      const { rows } = await db.query<{ version: number; definition: unknown }>(
        "select version, definition from form_template_versions order by version");
      expect(rows[0].definition).toEqual(original);
      const definition = parseFormTemplateDefinition(rows[1].definition);
      expect(definition.sections[0].fields.map(field => field.key)).toEqual(["purpose_of_request"]);
      expect(definition.sections[1].fields.map(field => field.key)).toEqual([
        "subjects", "owner_province", "owner_city", "owner_barangay", "owner_street",
      ]);
      const answers = { owner_province: "Albay", owner_city: "City of Legazpi", owner_barangay: "Rawis" };
      expect(validateTemplateAnswers(definition, answers).success).toBe(true);
      expect(validateTemplateAnswers(definition, { ...answers, owner_city: "Invalid" }).success).toBe(false);
      expect(validateTemplateAnswers(definition, { requester_province: "Albay", requester_city: "City of Legazpi",
        requester_barangay: "Rawis" }).success).toBe(false);
      await db.exec(readFileSync(new URL("../../supabase/migrations/20261115093000_restore_ctc_requester_address.sql", import.meta.url), "utf8"));
      const restored = await db.query<{ definition: unknown }>(`select v.definition from form_templates t
        join form_template_versions v on v.id = t.active_version_id`);
      expect(restored.rows[0].definition).toEqual(original);
    } finally {
      await db.close();
    }
  });

  it("keeps owner and requester addresses separate", () => {
    const answers = { owner_province: "Albay", owner_city: "City of Legazpi", owner_barangay: "Rawis",
      requester_address: "Requester's old address" };
    expect(formatOwnerAddress(answers)).toBe("Rawis, Legazpi City, Albay");
    expect(formatRequesterAddress(answers)).toBe("Requester's old address");
    expect(formatOwnerAddress({ requester_address: "Old address" })).toBe("");
    expect(addressDescendants("province", "owner")).toEqual(["owner_city", "owner_barangay"]);
  });
});
