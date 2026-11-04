import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const migration = readFileSync(new URL("../../../supabase/migrations/20261104053630_death_previous_uploads.sql", import.meta.url), "utf8");

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create function public.get_user_role() returns text language sql as $$ select 'staff'::text $$;
    create table public.requests (id int primary key, request_type text);
    create table public.requirements_attachments (
      id int primary key, request_id int references requests,
      file_url text, verification_status text, rejection_reason text,
      uploaded_at timestamptz default '2026-11-01T00:00:00Z'
    );
    create schema storage;
    create table storage.objects (name text, bucket_id text);
    alter table storage.objects enable row level security;
    create policy "Personnel read documents on permitted requests"
      on storage.objects for select to authenticated using (false);
    grant usage on schema storage to authenticated;
    grant select on storage.objects, public.requirements_attachments to authenticated;
    alter table public.requirements_attachments enable row level security;
    create policy permitted on public.requirements_attachments for select to authenticated
      using (request_id = 1);
    insert into requests values (1, 'DEATH_ONTIME'), (2, 'DEATH_DELAYED'), (3, 'BIRTH_DELAYED');
    insert into requirements_attachments(id, request_id, file_url, verification_status, rejection_reason)
      values (1,1,'old.pdf','rejected','Blurry'),
             (2,2,'delayed.pdf','rejected','Cut off'),
             (3,3,'birth.pdf','rejected','Blurry');
  `);
  await db.exec(migration);
}, 30_000);
afterAll(() => db.close());

describe("death upload history", () => {
  it("archives the rejected file and reason atomically while keeping one pending attachment", async () => {
    await db.exec("update requirements_attachments set file_url='new.pdf', verification_status='pending', rejection_reason=null where id=1");
    const { rows } = await db.query<{ verification_status: string; rejection_reason: null; previous_uploads: unknown[] }>(
      "select * from requirements_attachments where id=1",
    );
    expect(rows[0]).toMatchObject({
      file_url: "new.pdf", verification_status: "pending", rejection_reason: null,
      previous_uploads: [{ fileUrl: "old.pdf", rejectionReason: "Blurry", uploadedAt: "2026-11-01T00:00:00+00:00" }],
    });
    expect(rows[0].previous_uploads).toHaveLength(1);
    expect((await db.query("select * from requirements_attachments where request_id=1")).rows).toHaveLength(1);
  });

  it("preserves multiple rejections without treating review changes as uploads", async () => {
    await db.exec("update requirements_attachments set verification_status='rejected', rejection_reason='Wrong document' where id=1");
    await db.exec("update requirements_attachments set file_url='third.pdf', verification_status='pending', rejection_reason=null where id=1");
    await db.exec("update requirements_attachments set verification_status='approved' where id=1");
    const { rows } = await db.query<{ previous_uploads: { fileUrl: string; rejectionReason: string }[] }>("select previous_uploads from requirements_attachments where id=1");
    expect(rows[0].previous_uploads.map((v) => [v.fileUrl, v.rejectionReason])).toEqual([
      ["old.pdf", "Blurry"], ["new.pdf", "Wrong document"],
    ]);
  });

  it("supports delayed death and leaves other services unchanged", async () => {
    await db.exec("update requirements_attachments set file_url='delayed-new.pdf', verification_status='pending', rejection_reason=null where id=2");
    await db.exec("update requirements_attachments set file_url='birth-new.pdf', verification_status='pending', rejection_reason=null where id=3");
    const { rows } = await db.query<{ previous_uploads: unknown[] }>("select previous_uploads from requirements_attachments where id in (2,3) order by id");
    expect(rows[0].previous_uploads).toHaveLength(1);
    expect(rows[1].previous_uploads).toEqual([]);
  });

  it("ignores attempts to erase history", async () => {
    await db.exec("update requirements_attachments set previous_uploads='[]' where id=1");
    const { rows } = await db.query<{ count: number }>("select jsonb_array_length(previous_uploads) as count from requirements_attachments where id=1");
    expect(rows[0].count).toBe(2);
  });

  it("allows retained storage files only through visible attachments and the correct bucket", async () => {
    await db.exec(`
      insert into storage.objects values ('old.pdf','request-documents'), ('new.pdf','request-documents'),
        ('third.pdf','request-documents'), ('delayed.pdf','request-documents'),
        ('unrelated.pdf','request-documents'), ('old.pdf','other-bucket');
      set role authenticated;
    `);
    try {
      const { rows } = await db.query<{ name: string }>("select name from storage.objects order by name");
      expect(rows.map((r) => r.name)).toEqual(["new.pdf", "old.pdf", "third.pdf"]);
    } finally {
      await db.exec("reset role");
    }
  });
});
