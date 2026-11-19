import { beforeEach, expect, it, vi } from "vitest";

const state=vi.hoisted(()=>({
  endorsed:null as string | null, fees:0, status:"ready_for_release", service:"DEATH_ONTIME", posting: null as string | null,
  notify:vi.fn(), build:vi.fn(()=>({text:"ready to claim"})),
}));
vi.mock("@tanstack/react-start",()=>({createServerFn:()=>({validator:()=>({handler:(fn:unknown)=>fn})})}));
vi.mock("~/server/auth",()=>({requireActiveSession:async()=>({
  user:{id:"cashier"},supabase:{rpc:async()=>({data:false,error:null}),from:()=>{
    const query={
      select:()=>query,eq:()=>query,
      single:async()=>({data:{id:"request",status:state.status,fees_due:state.fees,tracking_number:"TEST",request_type:state.service,posting_start_date:state.posting,psa_endorsed_on:state.endorsed},error:null}),
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
beforeEach(()=>{state.endorsed=null;state.fees=0;state.status="ready_for_release";state.service="DEATH_ONTIME";state.posting=null;vi.clearAllMocks();});

it("accepts delayed death payment during posting without announcing collection",async()=>{
  state.status="processing"; state.service="DEATH_DELAYED"; state.posting="2026-11-10"; state.fees=620;
  expect(await verifyPaymentFn({data:{requestId:"request",orNumber:"OR-123"}})).toEqual({error:false});
  expect(state.notify).not.toHaveBeenCalled();
});
it("refuses early payment without posting and for other services",async()=>{
  state.status="processing"; state.service="DEATH_DELAYED"; state.fees=620;
  expect((await verifyPaymentFn({data:{requestId:"request",orNumber:"OR-123"}})).error).toBe(true);
  state.posting="2026-11-10"; state.service="DEATH_ONTIME";
  expect((await verifyPaymentFn({data:{requestId:"request",orNumber:"OR-123"}})).error).toBe(true);
});

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

it("accepts payment during Processing without an endorsement date or collection notice",async()=>{
  state.status="processing"; state.service="ELEC_ENDORSEMENT"; state.fees=100;
  expect(await verifyPaymentFn({data:{requestId:"request",orNumber:"OR-123"}})).toEqual({error:false});
  expect(state.notify).not.toHaveBeenCalled();
});
