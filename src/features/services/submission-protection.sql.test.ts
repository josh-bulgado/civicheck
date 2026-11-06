import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const db = new PGlite();
const applicant = randomUUID();
const key = randomUUID();
async function submit(service = "BIRTH_ONTIME", owner: string | null = applicant, submissionKey: string | null = randomUUID()) {
  return db.query(
    "insert into requests (id, applicant_id, request_type, submission_key) values ($1,$2,$3,$4)",
    [randomUUID(), owner, service, submissionKey],
  );
}
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table requests (
      id uuid primary key, applicant_id uuid, request_type text,
      created_at timestamptz default now(), status text default 'submitted'
    );
    grant all on requests to service_role;
  `);
  await db.exec(readFileSync(new URL("../../../supabase/migrations/20261105153338_protect_online_submissions.sql", import.meta.url), "utf8"));
}, 30000);
beforeEach(() => db.exec("delete from requests"));
afterAll(() => db.close());

describe("database submission guard", () => {
  it("allows five requests across services and refuses the sixth", async () => {
    for (const service of ["BIRTH_ONTIME", "DEATH_ONTIME", "CTC-LOCAL", "MARRIAGE_LICENSE", "EMAIL_INQUIRY"]) await submit(service);
    await expect(submit("OTHER_SERVICE")).rejects.toThrow("up to 5 requests per hour");
    expect((await db.query("select * from requests")).rows).toHaveLength(5);
  });
  it("keeps duplicate attempts out even at the limit", async () => {
    await submit("BIRTH_ONTIME", applicant, key);
    for (let i = 0; i < 4; i++) await submit();
    await expect(submit("BIRTH_ONTIME", applicant, key)).rejects.toThrow("requests_applicant_submission_key");
    expect((await db.query("select * from requests")).rows).toHaveLength(5);
  });
  it("allows another account and staff walk-ins", async () => {
    for (let i = 0; i < 5; i++) await submit();
    await submit("CTC-LOCAL", randomUUID());
    for (let i = 0; i < 6; i++) await submit("CTC-LOCAL", null, null);
  });
  it("allows submission when the oldest request leaves the window", async () => {
    for (let i = 0; i < 5; i++) await submit();
    await db.exec("update requests set created_at = now() - interval '61 minutes' where id = (select id from requests limit 1)");
    await submit();
  });
  it("counts closed requests toward the allowance", async () => {
    for (let i = 0; i < 5; i++) await submit();
    await db.exec("update requests set status='cancelled'");
    await expect(submit()).rejects.toThrow("up to 5 requests per hour");
  });
  it("rate limits legacy clients during rollout too", async () => {
    for (let i = 0; i < 5; i++) await submit("CTC-LOCAL", applicant, null);
    await expect(submit("CTC-LOCAL", applicant, null)).rejects.toThrow("up to 5 requests per hour");
  });
  it("does not spend an allowance when a request is rolled back", async () => {
    await db.exec("begin");
    await submit();
    await db.exec("rollback");
    for (let i = 0; i < 5; i++) await submit();
  });
  it("makes the submission ID immutable", async () => {
    await submit("BIRTH_ONTIME", applicant, key);
    await expect(db.query("update requests set submission_key=$1", [randomUUID()])).rejects.toThrow("cannot be changed");
  });
  it("enforces the guard for the service role used by online submission", async () => {
    await db.exec("set role service_role");
    try {
      for (let i = 0; i < 5; i++) await submit();
      await expect(submit()).rejects.toThrow("up to 5 requests per hour");
    } finally {
      await db.exec("reset role");
    }
  });
});
