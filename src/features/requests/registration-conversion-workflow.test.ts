import { beforeEach, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({missing:true,writes:vi.fn()}));
vi.mock("@tanstack/react-start",()=>({createServerFn:()=>({validator:()=>({handler:(fn:unknown)=>fn})})}));
vi.mock("./missing-uploads.server",()=>({loadAddableUploads:async()=>state.missing?[{isMandatory:true}]:[]}));
vi.mock("~/features/notifications/notifications.server",()=>({
  buildStatusChangeEmail:vi.fn(),buildCashierClearedEmail:vi.fn(),dispatchApplicantNotification:vi.fn(),
  buildDocumentRejectedEmail:vi.fn(),buildPreValidationCompleteEmail:vi.fn(),
}));
vi.mock("~/server/auth",()=>({requireActiveSession:async()=>({
  user:{id:"staff"},role:"admin",departmentId:null,
  supabase:{from:(table:string)=>{
    const query={select:()=>query,eq:()=>query,
      single:async()=>({data:{id:"request",status:"under_validation",payment_status:"unpaid",fees_due:620,
        request_type:"DEATH_DELAYED",form_data:{},registration_conversion:{from_service:"DEATH_ONTIME"},
        claimed_by:"staff",claimed_stage:"under_validation",claim_expires_at:new Date(Date.now()+60000).toISOString(),
        services_registry:{department_id:"death"},tracking_number:"TEST"},error:null}),
      update:(values:unknown)=>{state.writes(values);return query;},insert:()=>query,
      then:(resolve:(value:unknown)=>unknown)=>resolve({data:table==="requests"?[{id:"request"}]:[{verification_status:"approved",requirement_id:"doc",requirement_name:"Certificate",subject_role:null}],error:null}),
    };return query;
  }},
})}));
import { advanceRequestStatusFn } from "./requests.mutations";
beforeEach(()=>{state.missing=true;vi.clearAllMocks();});
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
