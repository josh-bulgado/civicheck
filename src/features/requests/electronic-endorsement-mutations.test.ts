import { beforeEach, expect, it, vi } from "vitest";
import { postingToday } from "./marriage-posting";

const state = vi.hoisted(() => ({
  service:"ELEC_ENDORSEMENT", status:"processing", department:"archives", claimedBy:"staff",
  endorsedOn:null as string|null, location:"", instructions:"", rpc:vi.fn(), notify:vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({createServerFn: () => ({validator: () => ({handler: (fn: unknown) => fn})})}));
vi.mock("~/server/auth", () => ({requireActiveSession: async () => ({
  user:{id:"staff"},role:"staff",departmentId:state.department,supabase:{
    rpc:state.rpc,from:() => {
      const query = { select:() => query,eq:() => query,
        single:async () => ({data:{id:"request",request_type:state.service,status:state.status,tracking_number:"TEST",
          created_at:"2020-01-01T00:00:00Z",updated_at:"2026-11-13T00:00:00Z",claimed_by:state.claimedBy,claimed_stage:state.status,
          claim_expires_at:"2099-01-01T00:00:00Z",services_registry:{department_id:"archives"},payment_status:"unpaid",fees_due:100,
          psa_endorsed_on:state.endorsedOn,claiming_location:state.location,claiming_instructions:state.instructions},error:null}),
        then:(resolve:(result:unknown) => unknown) => resolve({data:[],error:null}),
      }; return query;
    },
  },
})}));
vi.mock("~/features/notifications/notifications.server", () => ({
  buildStatusChangeEmail:vi.fn(() => ({})),dispatchApplicantNotification:state.notify,
  buildCashierClearedEmail:vi.fn(),buildDocumentRejectedEmail:vi.fn(),buildPreValidationCompleteEmail:vi.fn(),
}));
import { saveElectronicEndorsementFn, advanceRequestStatusFn } from "./requests.mutations";

const details = () => ({requestId:"request",endorsedOn:postingToday(),claimingLocation:"Confirmed desk",
  claimingInstructions:"Bring the claim slip.",expectedUpdatedAt:"2026-11-13T00:00:00Z"});
beforeEach(() => {
  state.service="ELEC_ENDORSEMENT";state.status="processing";state.department="archives";state.claimedBy="staff";
  state.endorsedOn=null;state.location="";state.instructions="";
  vi.clearAllMocks();state.rpc.mockResolvedValue({data:false,error:null});
});
it("records the date and instructions through the atomic staff action", async () => {
  expect(await saveElectronicEndorsementFn({data:details()})).toEqual({error:false});
  expect(state.rpc).toHaveBeenCalledWith("save_staff_request_action",expect.objectContaining({
    p_expected_status:"processing",p_action:"endorsement_updated",p_values:expect.objectContaining({
      psa_endorsed_on:postingToday(),claiming_location:"Confirmed desk",claiming_instructions:"Bring the claim slip.",
    }),
  }));
});
it("refuses a different department, lost claim, wrong service, or wrong stage", async () => {
  for (const patch of [{department:"birth"},{claimedBy:"another-staff"},{service:"CTC-LOCAL"},{status:"ready_for_release"}]) {
    Object.assign(state,patch);
    expect((await saveElectronicEndorsementFn({data:details()})).error).toBe(true);
    Object.assign(state,{department:"archives",claimedBy:"staff",service:"ELEC_ENDORSEMENT",status:"processing"});
  }
  expect(state.rpc).not.toHaveBeenCalled();
});
it("rejects invalid dates without writing", async () => {
  for (const endorsedOn of ["2999-01-01","1900-01-01"])
    expect((await saveElectronicEndorsementFn({data:{...details(),endorsedOn}})).error).toBe(true);
  expect(state.rpc).not.toHaveBeenCalled();
});
it("requires claiming details and availability confirmation before readiness", async () => {
  const input = {requestId:"request",toStatus:"ready_for_release",expectedUpdatedAt:"2026-11-13T00:00:00Z"};
  expect((await advanceRequestStatusFn({data:{...input,psaCertificateAvailableConfirmed:true}})).error).toBe(true);
  state.endorsedOn=postingToday();state.location="Confirmed desk";state.instructions="Bring the claim slip.";
  expect((await advanceRequestStatusFn({data:input})).error).toBe(true);
  expect(state.rpc).not.toHaveBeenCalled();
  expect((await advanceRequestStatusFn({data:{...input,psaCertificateAvailableConfirmed:true}})).error).toBe(false);
  expect(state.rpc).toHaveBeenCalledWith("save_staff_request_action",expect.objectContaining({p_values:expect.objectContaining({
    status:"ready_for_release",psa_certificate_available_confirmed:true,expected_updated_at:input.expectedUpdatedAt,
  })}));
});
it("rejects a readiness confirmation after the request changed", async () => {
  state.endorsedOn=postingToday();state.location="Confirmed desk";state.instructions="Bring ID.";
  expect((await advanceRequestStatusFn({data:{requestId:"request",toStatus:"ready_for_release",psaCertificateAvailableConfirmed:true,
    expectedUpdatedAt:"2000-01-01T00:00:00Z"}})).error).toBe(true);
  expect(state.rpc).not.toHaveBeenCalled();
});
