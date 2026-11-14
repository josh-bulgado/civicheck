import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const db = new PGlite();
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const admin = "00000000-0000-4000-8000-000000000003";
const personnel = "00000000-0000-4000-8000-000000000004";
const request = "00000000-0000-4000-8000-000000000010";
const otherRequest = "00000000-0000-4000-8000-000000000011";
async function actAs(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
}
const feedback = (requestId = request, applicant = owner, rating = 4) =>
  db.query<{ id: string }>(
    "insert into request_feedback(request_id, applicant_id, rating) values ($1,$2,$3) returning id",
    [requestId, applicant, rating],
  );
const report = (requestId: string | null = null, applicant = owner) =>
  db.query<{ id: string; reference_number: number }>(
    "insert into problem_reports(applicant_id,request_id,category,description,page_path) values ($1,$2,'uploads','The upload did not finish.','/my-requests') returning id,reference_number",
    [applicant, requestId],
  );

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table profiles(id uuid primary key, role text, access_status text default 'active');
    create table requests(id uuid primary key, applicant_id uuid references profiles(id), request_type text, status text);
    create function public.get_user_role() returns text language sql stable as $$ select role from public.profiles where id=auth.uid() $$;
    create function public.is_active_user() returns boolean language sql stable as $$ select coalesce((select access_status='active' from public.profiles where id=auth.uid()),false) $$;
    grant usage on schema public,auth to authenticated,service_role,anon;
    grant select on profiles,requests to authenticated;
    alter table requests enable row level security;
    create policy request_read on requests for select to authenticated using (applicant_id=auth.uid() or get_user_role() in ('admin','staff','supervisor','cashier'));
    insert into profiles(id,role) values ('${owner}','applicant'),('${other}','applicant'),('${admin}','admin'),('${personnel}','staff');
    insert into requests values ('${request}','${owner}','BIRTH','released'),('${otherRequest}','${other}','CTC','released');
  `);
  await db.exec(
    readFileSync(
      new URL(
        "../../../supabase/migrations/20261108055027_add_citizen_feedback_and_problem_reports.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 30000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec(`reset role; truncate request_feedback,problem_reports restart identity;
    update profiles set access_status='active'; update profiles set role='staff' where id='${personnel}';
    update requests set status='released';`);
  await actAs(owner);
});

describe("feedback eligibility and confidentiality", () => {
  it("saves one immutable response without changing the completed request", async () => {
    await feedback();
    expect(
      (
        await db.query(
          "select rating,ease_rating,topics,comment,review_status from request_feedback",
        )
      ).rows[0],
    ).toEqual({
      rating: 4,
      ease_rating: null,
      topics: [],
      comment: "",
      review_status: "new",
    });
    expect(
      (await db.query("select status from requests where id=$1", [request]))
        .rows[0],
    ).toEqual({ status: "released" });
    await expect(feedback()).rejects.toThrow(/unique/i);
    await expect(
      db.exec("update request_feedback set rating=5"),
    ).rejects.toThrow(/permission denied/i);
    await expect(db.exec("delete from request_feedback")).rejects.toThrow(
      /permission denied/i,
    );
  });
  it.each([
    "submitted",
    "under_validation",
    "incomplete",
    "processing",
    "ready_for_release",
    "cancelled",
    "rejected",
  ])("rejects feedback for a %s request", async (status) => {
    await db.exec("reset role");
    await db.query("update requests set status=$1 where id=$2", [
      status,
      request,
    ]);
    await actAs(owner);
    await expect(feedback()).rejects.toThrow(/row-level security/i);
  });
  it("rejects another person's request and a forged applicant identity", async () => {
    await expect(feedback(otherRequest)).rejects.toThrow(/row-level security/i);
    await expect(feedback(otherRequest, other)).rejects.toThrow(
      /row-level security/i,
    );
  });
  it("lets only the owner and active admin read individual responses", async () => {
    await feedback();
    await actAs(other);
    expect(
      (await db.query("select * from request_feedback")).rows,
    ).toHaveLength(0);
    await actAs(admin);
    expect(
      (await db.query("select * from request_feedback")).rows,
    ).toHaveLength(1);
    for (const role of ["staff", "supervisor", "cashier", "system_admin"]) {
      await db.exec("reset role");
      await db.query("update profiles set role=$1 where id=$2", [
        role,
        personnel,
      ]);
      await actAs(personnel);
      expect(
        (await db.query("select * from request_feedback")).rows,
      ).toHaveLength(0);
      await expect(feedback()).rejects.toThrow(/row-level security/i);
    }
  });
  it("blocks suspended applicants and administrators", async () => {
    await feedback();
    await db.exec(
      `reset role; update profiles set access_status='suspended' where id in ('${owner}','${admin}')`,
    );
    for (const id of [owner, admin]) {
      await actAs(id);
      expect(
        (await db.query("select * from request_feedback")).rows,
      ).toHaveLength(0);
      await expect(report(null, id)).rejects.toThrow(/row-level security/i);
    }
  });
  it("does not let an applicant set review status, timestamps or reviewer", async () => {
    await expect(
      db.exec(
        `insert into request_feedback(request_id,applicant_id,rating,review_status) values ('${request}','${owner}',5,'reviewed')`,
      ),
    ).rejects.toThrow(/permission denied/i);
    await feedback();
    expect(
      (
        await db.query(
          "update request_feedback set review_status='reviewed' returning id",
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      db.exec("update request_feedback set reviewed_at=now()"),
    ).rejects.toThrow(/permission denied/i);
  });
  it("allows admin review while keeping the rating and comment immutable", async () => {
    await feedback();
    await actAs(admin);
    await db.exec("update request_feedback set review_status='needs_action'");
    const row = (
      await db.query<{
        reviewed_at: string;
        reviewed_by: string;
        review_status: string;
      }>("select reviewed_at,reviewed_by,review_status from request_feedback")
    ).rows[0];
    expect(row.review_status).toBe("needs_action");
    expect(row.reviewed_by).toBe(admin);
    expect(row.reviewed_at).toBeTruthy();
    await expect(
      db.exec("update request_feedback set comment='edited'"),
    ).rejects.toThrow(/permission denied/i);
    await expect(db.exec("delete from request_feedback")).rejects.toThrow(
      /permission denied/i,
    );
  });
  it.each([0, 6])("rejects an out-of-range rating %s", async (value) => {
    await expect(feedback(request, owner, value)).rejects.toThrow(
      /check constraint/i,
    );
  });
  it("rejects invalid optional fields", async () => {
    await expect(
      db.exec(
        `insert into request_feedback(request_id,applicant_id,rating,ease_rating) values ('${request}','${owner}',3,9)`,
      ),
    ).rejects.toThrow(/check constraint/i);
    await expect(
      db.exec(
        `insert into request_feedback(request_id,applicant_id,rating,topics) values ('${request}','${owner}',3,array['invalid'])`,
      ),
    ).rejects.toThrow(/check constraint/i);
    await expect(
      db.exec(
        `insert into request_feedback(request_id,applicant_id,rating,comment) values ('${request}','${owner}',3,repeat('a',2001))`,
      ),
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("problem reports", () => {
  it("accepts general reports and reports at an unfinished request stage", async () => {
    expect((await report()).rows[0].reference_number).toBe(1);
    await db.exec(
      `reset role; update requests set status='submitted' where id='${request}'`,
    );
    await actAs(owner);
    expect((await report(request)).rows[0].reference_number).toBe(2);
    await actAs(other);
    expect((await db.query("select * from problem_reports")).rows).toHaveLength(
      0,
    );
    await actAs(admin);
    expect((await db.query("select * from problem_reports")).rows).toHaveLength(
      2,
    );
  });
  it("refuses forged request context or account identity", async () => {
    await expect(report(otherRequest)).rejects.toThrow(/row-level security/i);
    await expect(report(null, other)).rejects.toThrow(/row-level security/i);
  });
  it("rejects empty descriptions and page paths carrying query parameters", async () => {
    await expect(
      db.exec(
        `insert into problem_reports(applicant_id,category,description) values ('${owner}','other','   ')`,
      ),
    ).rejects.toThrow(/check constraint/i);
    await expect(
      db.exec(
        `insert into problem_reports(applicant_id,category,description,page_path) values ('${owner}','other','Problem','/apply?token=secret')`,
      ),
    ).rejects.toThrow(/check constraint/i);
  });
  it("limits report submissions even through the direct Data API", async () => {
    for (let i = 0; i < 5; i++) await report();
    await expect(report()).rejects.toThrow(/wait 10 minutes/i);
    await db.exec(
      "reset role; update problem_reports set created_at=now()-interval '11 minutes'",
    );
    await actAs(owner);
    expect((await report()).rows).toHaveLength(1);
  });
  it("lets admins change status without changing report content", async () => {
    await report();
    await actAs(admin);
    await db.exec("update problem_reports set review_status='under_review'");
    expect(
      (await db.query("select review_status,reviewed_by from problem_reports"))
        .rows[0],
    ).toEqual({ review_status: "under_review", reviewed_by: admin });
    await expect(
      db.exec("update problem_reports set description='edited'"),
    ).rejects.toThrow(/permission denied/i);
    await db.exec("update problem_reports set review_status='resolved'");
  });
});

describe("admin summaries", () => {
  it("counts all feedback in the selected date/service range and excludes problem reports", async () => {
    await feedback(request, owner, 5);
    await report();
    await actAs(other);
    await feedback(otherRequest, other, 2);
    await actAs(admin);
    const summary = async (
      service: string | null = null,
      from: string | null = null,
    ) =>
      (
        await db.query<{ summary: unknown }>(
          "select citizen_feedback_summary($1,null,$2) as summary",
          [from, service],
        )
      ).rows[0].summary;
    expect(await summary()).toEqual({
      total: 2,
      satisfied: 1,
      distribution: [0, 1, 0, 0, 1],
    });
    expect(await summary("BIRTH")).toEqual({
      total: 1,
      satisfied: 1,
      distribution: [0, 0, 0, 0, 1],
    });
    expect(await summary(null, "2099-01-01")).toEqual({
      total: 0,
      satisfied: 0,
      distribution: [0, 0, 0, 0, 0],
    });
  });
  it("rejects non-admin and anonymous summary access", async () => {
    await expect(db.query("select citizen_feedback_summary()")).rejects.toThrow(
      /active administrator/i,
    );
    await db.exec("reset role; set role anon");
    await expect(db.query("select citizen_feedback_summary()")).rejects.toThrow(
      /permission denied/i,
    );
    await expect(db.query("select * from request_feedback")).rejects.toThrow(
      /permission denied/i,
    );
  });
});
