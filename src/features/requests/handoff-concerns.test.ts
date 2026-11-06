import { describe, expect, it } from "vitest";
import { getHandoffConcerns } from "./handoff-concerns";
import type { LogEntry } from "./request-history";
const at=(minute:number)=>new Date(Date.UTC(2026,10,6,2,minute)).toISOString();
const entry=(id:string,actionStatus:string,remarks:string|null,minute:number):LogEntry=>({
  id,actionStatus,remarks,createdAt:at(minute),actorName:"Birth Supervisor",
});
const accepted=[{requirementName:"Birth certificate",verificationStatus:"approved"}];

describe("staff handoff concerns",()=>{
  it("keeps a manual return reason visible even if all uploads remain accepted",()=>{
    const result=getHandoffConcerns("under_validation",[
      entry("1","processing",null,0),
      entry("2","under_validation","The original has a different name.",1),
    ],accepted);
    expect(result).toEqual([{id:"2",title:"Returned to validation",reason:"The original has a different name.",
      actorName:"Birth Supervisor",createdAt:at(1)}]);
  });
  it("shows the reopened document reason instead of the automatic status note",()=>{
    const result=getHandoffConcerns("under_validation",[
      entry("1","processing",null,0),
      entry("2","under_validation","Returned to validation — staff are re-checking a document.",1),
      entry("3","document_reverted",'Reopened "Birth certificate" (was approved): Original does not match.',1),
    ],[{requirementName:"Birth certificate",verificationStatus:"pending"}]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({title:"Birth certificate",reason:"Original does not match.",actorName:"Birth Supervisor"});
  });
  it("preserves a reason that starts with Returned to validation",()=>{
    const result=getHandoffConcerns("under_validation",[
      entry("1","processing",null,0),
      entry("2","under_validation","Returned to validation because the original is different.",1),
    ],accepted);
    expect(result[0].reason).toBe("Returned to validation because the original is different.");
  });
  it("does not flag normal first validation as a handoff problem",()=>{
    expect(getHandoffConcerns("under_validation",[
      entry("1","submitted",null,0),entry("2","under_validation",'Advanced from "Submitted".',1),
    ],accepted)).toEqual([]);
  });
  it("clears the notice after validation moves forward",()=>{
    expect(getHandoffConcerns("processing",[
      entry("1","under_validation","Wrong name.",1),
      entry("2","processing",null,2),
    ],accepted)).toEqual([]);
  });
  it("does not bring back a concern from an earlier processing cycle",()=>{
    expect(getHandoffConcerns("under_validation",[
      entry("1","processing",null,0),entry("2","under_validation","Old issue.",1),
      entry("3","processing",null,2),entry("4","under_validation","New issue.",3),
    ],accepted)[0].reason).toBe("New issue.");
  });
  it("shows rejection reasons while corrections are pending",()=>{
    const result=getHandoffConcerns("incomplete",[
      entry("1","document_rejected",'Rejected "Birth certificate": Cut off.',1),
      entry("2","incomplete","Replace the cut-off file.",2),
    ],[{requirementName:"Birth certificate",verificationStatus:"rejected"}]);
    expect(result[0]).toMatchObject({reason:"Cut off.",title:"Birth certificate"});
  });
});
