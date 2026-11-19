import { beforeEach, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({missing:true,status:"under_validation",service:"DEATH_DELAYED",payment:"unpaid",writes:vi.fn()}));
vi.mock("@tanstack/react-start",()=>({createServerFn:()=>({validator:()=>({handler:(fn:unknown)=>fn})})}));
vi.mock("./missing-uploads.server",()=>({loadAddableUploads:async()=>state.missing?[{isMandatory:true}]:[]}));
vi.mock("~/features/notifications/notifications.server",()=>({
  buildStatusChangeEmail:vi.fn(),buildCashierClearedEmail:vi.fn(),dispatchApplicantNotification:vi.fn(),
  buildDocumentRejectedEmail:vi.fn(),buildPreValidationCompleteEmail:vi.fn(),
}));
vi.mock("~/server/auth",()=>({requireActiveSession:async()=>({
  user:{id:"staff"},role:"admin",departmentId:null,
  supabase:{rpc:async(_name:string,args:{p_values:unknown})=>{
    state.writes(args.p_values);return {data:false,error:null};
  },from:(table:string)=>{
    const query={select:()=>query,eq:()=>query,
      single:async()=>({data:{id:"request",status:state.status,payment_status:state.payment,fees_due:620,
        request_type:state.service,form_data:{},registration_conversion:{from_service:"DEATH_ONTIME"},
        claimed_by:"staff",claimed_stage:state.status,claim_expires_at:new Date(Date.now()+60000).toISOString(),
        services_registry:{department_id:"death"},tracking_number:"TEST"},error:null}),
      update:(values:unknown)=>{state.writes(values);return query;},insert:()=>query,
      then:(resolve:(value:unknown)=>unknown)=>resolve({data:table==="requests"?[{id:"request"}]:[{verification_status:"approved",requirement_id:"doc",requirement_name:"Certificate",subject_role:null}],error:null}),
    };return query;
  }},
})}));
import { advanceRequestStatusFn } from "./requests.mutations";
beforeEach(()=>{state.missing=true;state.status="under_validation";state.service="DEATH_DELAYED";state.payment="unpaid";vi.clearAllMocks();});
it("blocks processing when converted registration requirements are still missing",async()=>{
  const result=await advanceRequestStatusFn({data:{requestId:"request",toStatus:"processing"}});
  expect(result.error).toBe(true);
  expect(result.message).toContain("additional required documents");
  expect(state.writes).not.toHaveBeenCalled();
});
it("allows processing after the delayed requirements have been uploaded and accepted",async()=>{
  state.missing=false;
  const result=await advanceRequestStatusFn({data:{requestId:"request",toStatus:"processing"}});
  expect(result.error).toBe(false);
  expect(state.writes).toHaveBeenCalledWith(expect.objectContaining({status:"processing"}));
});

it("blocks registration readiness when the physical check is not confirmed", async () => {
  state.missing=false;state.status="processing";state.service="OTCOLB-MARITAL";
  const result=await advanceRequestStatusFn({data:{requestId:"request",toStatus:"ready_for_release"}});
  expect(result.error).toBe(true);
  expect(result.message).toContain("checked the original documents");
  expect(state.writes).not.toHaveBeenCalled();
});
it("sends the explicit originals confirmation to the database", async () => {
  state.missing=false;state.status="processing";state.service="OTCOLB-MARITAL";
  const result=await advanceRequestStatusFn({data:{requestId:"request",toStatus:"ready_for_release",originalsConfirmed:true}});
  expect(result.error).toBe(false);
  expect(state.writes).toHaveBeenCalledWith(expect.objectContaining({status:"ready_for_release",originals_confirmed:true}));
});

it.each(["processing","ready_for_release"])("requires a return reason from %s on the server",async(status)=>{
  state.status=status;state.service="CTC_ISSUANCE";state.missing=false;
  const result=await advanceRequestStatusFn({data:{requestId:"request",toStatus:"under_validation",remarks:"  "}});
  expect(result.error).toBe(true);
  expect(result.message).toContain("needs rechecking");
  expect(state.writes).not.toHaveBeenCalled();
});
it("rejects a release without identity confirmation on the server",async()=>{
  state.status="ready_for_release";state.service="EMAIL_INQUIRY";state.payment="verified";state.missing=false;
  const result=await advanceRequestStatusFn({data:{requestId:"request",toStatus:"released"}});
  expect(result.error).toBe(true);
  expect(result.message).toContain("identity");
  expect(state.writes).not.toHaveBeenCalled();
});
it("rejects physical release without handover confirmation on the server",async()=>{
  state.status="ready_for_release";state.service="CTC_ISSUANCE";state.payment="verified";state.missing=false;
  const result=await advanceRequestStatusFn({data:{requestId:"request",toStatus:"released",originalsConfirmed:true,identityVerified:true}});
  expect(result.error).toBe(true);
  expect(result.message).toContain("handing over");
  expect(state.writes).not.toHaveBeenCalled();
});

it("blocks uncertain court validation without staff confirmation", async () => {
  state.service="COURT-ANNULMENT";state.missing=false;
  const result=await advanceRequestStatusFn({data:{requestId:"request",toStatus:"processing"}});
  expect(result.error).toBe(true);
  expect(result.message).toContain("Verify the issuing court");
  expect(state.writes).not.toHaveBeenCalled();
});
it("passes the court confirmation to the database", async () => {
  state.service="COURT-FOREIGN-ADOPTION";state.missing=false;
  const result=await advanceRequestStatusFn({data:{requestId:"request",toStatus:"processing",courtIssuerConfirmed:true}});
  expect(result.error).toBe(false);
  expect(state.writes).toHaveBeenCalledWith(expect.objectContaining({court_issuer_confirmed:true}));
});
