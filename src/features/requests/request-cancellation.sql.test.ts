import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { canCancelCtcRequest } from "./request-cancellation";
import { nextStatuses, TERMINAL_STATUSES } from "./request-workflow";
import { isClosedRequestStatus } from "./document-review";
import { requestTurn } from "./requests-table.utils";

const read = (name: string) => readFileSync(new URL(`../../../supabase/migrations/${name}`, import.meta.url), "utf8");
const db = new PGlite();
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const request = "00000000-0000-4000-8000-000000000003";
const cancel = (applicant = owner) => db.query<{ cancelled: boolean }>(
  "select public.cancel_own_ctc_birth_request($1, $2) as cancelled", [request, applicant],
);

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table requests (
      id uuid primary key, applicant_id uuid, tracking_number text unique,
      request_type text, status text,
      form_data jsonb, constraint requests_status_check check (status <> 'cancelled')
    );
    create table application_logs (
      request_id uuid, performed_by_profile_id uuid, action_status text, remarks text
    );
    create table requirements_attachments (
      id int primary key, request_id uuid, verification_status text,
      requirement_name text, subject_role text, file_url text, uploaded_at timestamptz
    );
    grant usage on schema public to service_role, authenticated;
    grant all on requests, application_logs, requirements_attachments to service_role;
  `);
  const guards = read("20261029120000_hold_documents_through_release.sql");
  await db.exec(guards.slice(guards.indexOf("create or replace function public.guard_request_workflow()"), guards.indexOf("create unique index")));
  await db.exec(`
    create trigger workflow before insert or update on requests for each row execute function guard_request_workflow();
    create trigger attachment_guard before update on requirements_attachments for each row execute function guard_attachment_review_fields();
  `);
  await db.exec(read("20261104115804_ctc_birth_request_cancellation.sql"));
  const extension = read("20261104145753_shared_upload_history_and_ctc_cancellation.sql");
  await db.exec(extension.slice(extension.indexOf("-- Extend the existing cancellation guard")));
}, 30000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec(`reset role; delete from application_logs; delete from requirements_attachments; delete from requests;
    insert into requests values ('${request}', '${owner}', 'OLD-TRACKING', 'CTC-LOCAL', 'submitted', '{"record_type":"birth"}');
    insert into requirements_attachments(id,request_id,verification_status) values (1, '${request}', 'pending');
    set role service_role;`);
});

describe("CTC cancellation", () => {
  it("keeps the request, tracking number and uploads, and records who cancelled it", async () => {
    expect((await cancel()).rows[0].cancelled).toBe(true);
    expect((await db.query("select status, tracking_number from requests")).rows[0]).toEqual({ status: "cancelled", tracking_number: "OLD-TRACKING" });
    expect((await db.query("select * from requirements_attachments")).rows).toHaveLength(1);
    expect((await db.query("select action_status, performed_by_profile_id from application_logs")).rows[0]).toEqual({ action_status: "cancelled", performed_by_profile_id: owner });
    expect((await cancel()).rows[0].cancelled).toBe(false);
    expect((await db.query("select * from application_logs")).rows).toHaveLength(1);
  });
  it("does not cancel another applicant's request", async () => {
    expect((await cancel(other)).rows[0].cancelled).toBe(false);
    expect((await db.query("select * from application_logs")).rows).toHaveLength(0);
  });
  it.each(["under_validation", "incomplete", "processing", "ready_for_release", "released", "rejected"])("refuses cancellation once status is %s, even from an old page", async (status) => {
    await db.query("update requests set status=$1", [status]);
    expect((await cancel()).rows[0].cancelled).toBe(false);
  });
  it.each([['CTC-LOCAL', 'other'], ['CTC-ABROAD', ''], ['EMAIL_INQUIRY', 'birth']])("refuses %s %s requests", async (service, record) => {
    await db.query("update requests set request_type=$1, form_data=jsonb_build_object('record_type', $2::text)", [service, record]);
    expect((await cancel()).rows[0].cancelled).toBe(false);
  });
  it.each(["CTC-LOCAL", "CTC-ABROAD", "CTC_ISSUANCE"])("allows birth, marriage and death cancellation for %s", async (service) => {
    for (const record of ["birth", "marriage", "death"]) {
      await db.exec("reset role; alter table requests disable trigger workflow;");
      await db.query("update requests set status='submitted', request_type=$1, form_data=jsonb_build_object('record_type', $2::text)", [service, record]);
      await db.exec("alter table requests enable trigger workflow; set role service_role;");
      expect(canCancelCtcRequest("submitted", service, { record_type: record })).toBe(true);
      expect((await cancel()).rows[0].cancelled).toBe(true);
    }
  });
  it("blocks direct cancellation of unsupported record types", async () => {
    await db.exec("update requests set form_data='{}'");
    await expect(db.exec("update requests set status='cancelled'")).rejects.toThrow("Only a submitted CTC");
  });
  it("saves cancellation and history together", async () => {
    await db.exec("reset role; alter table application_logs add constraint reject_log check (action_status <> 'cancelled'); set role service_role;");
    await expect(cancel()).rejects.toThrow();
    expect((await db.query("select status from requests")).rows[0]).toEqual({ status: "submitted" });
    await db.exec("reset role; alter table application_logs drop constraint reject_log;");
  });
  it("prevents reopening and document changes after cancellation", async () => {
    await cancel();
    await expect(db.exec("update requests set status='under_validation'")).rejects.toThrow("cannot be reopened");
    await expect(db.exec("update requirements_attachments set verification_status='approved'")).rejects.toThrow("closed");
  });
  it("does not expose the server-only action to a direct signed-in caller", async () => {
    await db.exec("set role authenticated");
    await expect(cancel()).rejects.toThrow("permission denied");
  });
  it("treats cancelled requests as closed and offers no staff transitions", () => {
    expect(nextStatuses("cancelled")).toEqual([]);
    expect(TERMINAL_STATUSES).toContain("cancelled");
    expect(isClosedRequestStatus("cancelled")).toBe(true);
    expect(requestTurn({ status: "cancelled", paymentStatus: "unpaid" })).toBe("none");
    expect(canCancelCtcRequest("submitted", "CTC-LOCAL", { record_type: "birth" })).toBe(true);
    expect(canCancelCtcRequest("under_validation", "CTC-LOCAL", { record_type: "birth" })).toBe(false);
  });
});
