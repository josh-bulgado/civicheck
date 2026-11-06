import { beforeEach, expect, it, vi } from "vitest";

const state=vi.hoisted(()=>({
  fees:0, status:"ready_for_release", service:"DEATH_ONTIME",
  notify:vi.fn(), build:vi.fn(()=>({text:"ready to claim"})),
}));
vi.mock("@tanstack/react-start",()=>({createServerFn:()=>({validator:()=>({handler:(fn:unknown)=>fn})})}));
vi.mock("~/server/auth",()=>({requireActiveSession:async()=>({
  user:{id:"cashier"},supabase:{from:()=>{
    const query={
      select:()=>query,eq:()=>query,
      single:async()=>({data:{id:"request",status:state.status,fees_due:state.fees,tracking_number:"TEST",request_type:state.service},error:null}),
      update:()=>query,insert:()=>query,
      then:(resolve:(result:unknown)=>unknown)=>resolve({data:[{id:"request"}],error:null}),
    };
    return query;
  }},
})}));
vi.mock("~/features/notifications/notifications.server",()=>({
  buildCashierClearedEmail:state.build,dispatchApplicantNotification:state.notify,
  buildStatusChangeEmail:vi.fn(),buildDocumentRejectedEmail:vi.fn(),buildPreValidationCompleteEmail:vi.fn(),
}));
import { verifyPaymentFn } from "./requests.mutations";
beforeEach(()=>{state.fees=0;state.status="ready_for_release";state.service="DEATH_ONTIME";vi.clearAllMocks();});

it("notifies the applicant after the cashier confirms no fee",async()=>{
  expect(await verifyPaymentFn({data:{requestId:"request",confirmNoFee:true}})).toEqual({error:false});
  expect(state.build).toHaveBeenCalledWith("TEST");
  expect(state.notify).toHaveBeenCalledOnce();
});
it("notifies the applicant after paid verification",async()=>{
  state.fees=150;
  expect(await verifyPaymentFn({data:{requestId:"request",orNumber:"OR-123"}})).toEqual({error:false});
  expect(state.notify).toHaveBeenCalledOnce();
});
it("does not announce collection before no-fee confirmation",async()=>{
  expect((await verifyPaymentFn({data:{requestId:"request"}})).error).toBe(true);
  expect(state.notify).not.toHaveBeenCalled();
});
it("does not announce collection without the receipt",async()=>{
  state.fees=150;
  expect((await verifyPaymentFn({data:{requestId:"request"}})).error).toBe(true);
  expect(state.notify).not.toHaveBeenCalled();
});
it("does not send online inquiries to collect a document",async()=>{
  state.service="EMAIL_INQUIRY";
  await verifyPaymentFn({data:{requestId:"request",confirmNoFee:true}});
  expect(state.notify).not.toHaveBeenCalled();
});
