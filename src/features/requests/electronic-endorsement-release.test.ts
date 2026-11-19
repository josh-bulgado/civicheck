import { expect, it } from "vitest";
import { estimatedPsaAvailability, endorsementReadyBlockedReason, endorsementWaitingMessage, type EndorsementDetails } from "./electronic-endorsement-release";
import { nextSteps } from "./next-steps";
import { planRequestActions } from "./request-actions";

const endorsement: EndorsementDetails = { endorsedOn:"2026-11-13",claimingLocation:"Confirmed PSA collection desk",
  claimingInstructions:"Bring the claim slip and valid ID.",availableAt:null };

it.each([
  ["2026-11-13","2026-12-13"], ["2026-01-31","2026-02-28"],
  ["2024-01-31","2024-02-29"], ["2026-12-15","2027-01-15"],
])("estimates one calendar month after %s", (date, expected) => {
  expect(estimatedPsaAvailability(date)).toBe(expected);
});
it("does not invent an estimated date without an actual endorsement date", () => {
  expect(estimatedPsaAvailability(null)).toBeNull();
  expect(estimatedPsaAvailability("invalid")).toBeNull();
});
it("keeps the readiness confirmation available regardless of the estimated date", () => {
  const input = { serviceCode:"ELEC_ENDORSEMENT",status:"processing",paymentStatus:"unpaid",feesDue:100,
    canProcess:true,attachments:[],endorsement };
  for (const today of ["2026-11-14","2027-01-01"]) {
    expect(planRequestActions({...input,today}).primary).toMatchObject({ to:"ready_for_release",dialog:"endorsement",blocked:undefined });
  }
  expect(endorsementReadyBlockedReason({...endorsement,claimingInstructions:" "})).toContain("claiming location and instructions");
  expect(endorsementReadyBlockedReason({...endorsement,endorsedOn:null})).toContain("date");
});
it("shows an estimated wait rather than asking applicants to collect during Processing", () => {
  const view = nextSteps({ serviceCode:"ELEC_ENDORSEMENT",status:"processing",paymentStatus:"unpaid",feesDue:100,
    allowsMessages:false,attachments:[],logs:[],endorsement });
  expect(view).toEqual({kind:"steps",steps:[endorsementWaitingMessage(endorsement), "Pay the service fee at the CCRO cashier. Payment does not mean the final certificate is ready."]});
  expect(view?.kind === "steps" && view.steps[0]).toContain("Wait for confirmation before visiting");
});
it("shows staff-entered claiming instructions without assuming collection at CCRO", () => {
  const input = {serviceCode:"ELEC_ENDORSEMENT",status:"ready_for_release",paymentStatus:"verified",feesDue:100,
    allowsMessages:false,attachments:[],logs:[],endorsement};
  const view = nextSteps(input);
  expect(view?.kind === "steps" && view.steps).toEqual([
    "Your final PSA certificate is available.","Claiming location: Confirmed PSA collection desk","Bring the claim slip and valid ID.",
  ]);
  const legacy = nextSteps({...input,endorsement:undefined});
  expect(legacy?.kind === "steps" && legacy.steps.join(" ")).not.toContain("CCRO");
});

it("allows the applicant to pay before the actual endorsement date is recorded", () => {
  const input={serviceCode:"ELEC_ENDORSEMENT",status:"processing",paymentStatus:"unpaid",feesDue:100,allowsMessages:false,attachments:[],logs:[]};
  const view=nextSteps(input);
  expect(view?.kind === "steps" && view.steps.join(" ")).toContain("Pay the service fee at the CCRO cashier");
  const paid=nextSteps({...input,paymentStatus:"verified"});
  expect(paid?.kind === "steps" && paid.steps.join(" ")).not.toContain("Pay the service fee");
});
