import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("moves record fields to details, keeps authorization, and preserves history", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table form_templates(id uuid primary key default gen_random_uuid(), template_key text, active_version_id uuid, updated_at timestamptz);
      create table form_template_versions(id uuid primary key default gen_random_uuid(), template_id uuid, version int, status text, definition jsonb, published_at timestamptz);
      insert into form_templates(template_key) values ('email_inquiry');
    `);
    const authorization = { key: "authorization", label: "Authorization", required: true };
    const original = { sections: [
      { key: "case", step: "case", fields: [
        { key: "record_type" },
        { key: "event_date", required: true, helpText: "Date help", dateDirection: "past" },
        { key: "event_place", required: true }, authorization,
      ] },
      { key: "details", step: "details", fields: [{ key: "owner", type: "person_group" }] },
    ] };
    await db.query("insert into form_template_versions(template_id,version,definition) select id,1,$1::jsonb from form_templates", [JSON.stringify(original)]);
    await db.exec("update form_templates set active_version_id=(select id from form_template_versions)");
    const sql = readFileSync(new URL("../../../supabase/migrations/20261114203715_email_inquiry_record_details.sql", import.meta.url), "utf8");
    await db.exec(sql);
    await db.exec(sql);
    const result = await db.query<{ definition: typeof original }>("select definition from form_template_versions order by version");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].definition).toEqual(original);
    const sections = result.rows[1].definition.sections;
    expect(sections[0].fields).toEqual([{ key: "record_type" }, authorization]);
    expect(sections[1].fields).toEqual([
      { key: "owner", type: "person_group" },
      { key: "event_date", required: true, dateDirection: "past", label: "DoB", labelByAnswer: {
        field: "record_type", labels: { birth: "DoB", death: "DoD", marriage: "DoM" },
      } },
      { key: "event_place", required: true, label: "PoB", labelByAnswer: {
        field: "record_type", labels: { birth: "PoB", death: "PoD", marriage: "PoM" },
      } },
    ]);
  } finally {
    await db.close();
  }
}, 30_000);
