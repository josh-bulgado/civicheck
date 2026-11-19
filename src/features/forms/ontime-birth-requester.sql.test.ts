import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

const addition = readFileSync(new URL("../../../supabase/migrations/20261110015510_ontime_birth_requester_information.sql", import.meta.url), "utf8");
const reversal = readFileSync(new URL("../../../supabase/migrations/20261110022230_revert_ontime_birth_requester_information.sql", import.meta.url), "utf8");

it("restores the original birth form without deleting history or changing delayed birth", async () => {
  const db = new PGlite();
  try {
    const original = { schemaVersion: 1, sections: [
      { key: "case", step: "case", title: "Case details", fields: [
        { key: "informant_name", type: "text", label: "Informant", required: false },
      ] },
      { key: "details", step: "details", title: "Your details", fields: [
        { key: "subjects", type: "person_group", label: "Child", required: true },
        { key: "contact_number", type: "phone", label: "Contact number", required: false },
      ] },
    ] };
    await db.exec(`create table form_templates(id uuid primary key default gen_random_uuid(),template_key text,active_version_id uuid,updated_at timestamptz);
      create table form_template_versions(id uuid primary key default gen_random_uuid(),template_id uuid,version int,status text,definition jsonb,published_at timestamptz);`);
    for (const key of ["birth_ontime", "birth_delayed"]) {
      await db.query("insert into form_templates(template_key) values($1)", [key]);
      await db.query("insert into form_template_versions(template_id,version,status,definition) select id,1,'published',$2::jsonb from form_templates where template_key=$1", [key, JSON.stringify(original)]);
    }
    await db.exec("update form_templates t set active_version_id=v.id from form_template_versions v where v.template_id=t.id");
    await db.exec(addition);
    await db.exec(reversal);
    await db.exec(reversal);
    const active = await db.query<{ definition: unknown }>("select v.definition from form_templates t join form_template_versions v on v.id=t.active_version_id");
    expect(active.rows).toHaveLength(2);
    for (const row of active.rows) expect(row.definition).toEqual(original);
    const versions = await db.query<{ template_key: string; version: number; definition: unknown }>("select template_key,version,definition from form_template_versions v join form_templates t on t.id=v.template_id order by template_key,version");
    expect(versions.rows).toHaveLength(4);
    expect(versions.rows.filter((v) => v.template_key === "birth_delayed")).toHaveLength(1);
    expect(versions.rows.find((v) => v.template_key === "birth_ontime" && v.version === 2)?.definition).not.toEqual(original);
  } finally {
    await db.close();
  }
}, 30_000);
