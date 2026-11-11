import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

const db = new PGlite();
const staff = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const migration = readFileSync(new URL(
  "../../../supabase/migrations/20261111151414_preserve_validation_handler.sql",
  import.meta.url,
), "utf8");

beforeAll(async () => {
  await db.exec(`
    create schema auth;
    create function auth.uid() returns uuid language sql as $$
      select nullif(current_setting('test.actor', true), '')::uuid
    $$;
    create table profiles(id uuid primary key);
    insert into profiles values ('${staff}'), ('${other}');
    create table requests(id integer primary key, request_type text, status text);
  `);
  await db.exec(readFileSync(new URL(
    "../../../supabase/migrations/20261105120000_add_request_stage_claims.sql",
    import.meta.url,
  ), "utf8"));
  await db.exec(migration);
  await db.exec(migration);
}, 30000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec(`
    set test.actor = '${staff}';
    delete from requests;
    insert into requests
      (id, request_type, status, claimed_by, claimed_stage, claimed_at, claim_expires_at)
    values (1, 'CTC_ISSUANCE', 'submitted', '${staff}', 'submitted',
      now() - interval '1 minute', now() + interval '14 minutes');
  `);
});

const claim = async () => (await db.query(
  "select claimed_by, claimed_stage, claimed_at, claim_expires_at from requests where id=1",
)).rows[0];
const emptyClaim = {
  claimed_by: null, claimed_stage: null, claimed_at: null, claim_expires_at: null,
};

it.each(["CTC_ISSUANCE", "BIRTH_ONTIME", "EMAIL_INQUIRY", "RA9048-CFN", "ANY_SERVICE"])(
  "keeps the active handler when starting validation for %s",
  async (service) => {
    await db.query("update requests set request_type=$1", [service]);
    const previous = await claim();
    await db.exec("update requests set status='under_validation'");
    expect(await claim()).toEqual({ ...previous, claimed_stage: "under_validation" });
  },
);

it.each([
  "set test.actor = ''",
  `set test.actor = '${other}'`,
  "update requests set claim_expires_at=now()-interval '1 second', claimed_at=now()-interval '16 minutes'",
  "update requests set claimed_by=null,claimed_stage=null,claimed_at=null,claim_expires_at=null",
])("does not carry an inactive or another actor's claim (%s)", async (setup) => {
  await db.exec(setup);
  await db.exec("update requests set status='under_validation'");
  expect(await claim()).toEqual(emptyClaim);
});

it.each([
  ["under_validation", "processing"],
  ["processing", "ready_for_release"],
  ["ready_for_release", "released"],
  ["processing", "under_validation"],
  ["ready_for_release", "under_validation"],
  ["incomplete", "under_validation"],
  ["submitted", "cancelled"],
])("clears the handler for the %s to %s handoff", async (from, to) => {
  await db.query("update requests set status=$1", [from]);
  await db.query(`
    update requests set claimed_by=$1,claimed_stage=status,
      claimed_at=now(),claim_expires_at=now()+interval '15 minutes'
  `, [staff]);
  await db.query("update requests set status=$1", [to]);
  expect(await claim()).toEqual(emptyClaim);
});

it("leaves the claim unchanged when the status stays the same", async () => {
  const previous = await claim();
  await db.exec("update requests set status=status");
  expect(await claim()).toEqual(previous);
});
