import { describe, expect, it } from "vitest";
import { buildCashierClearedEmail, buildStatusChangeEmail } from "~/features/notifications/notifications.server";
import { DOCUMENT_RELEASED, READY_TO_CLAIM, readyForReleaseInstruction } from "./release-instructions";

describe.each(["OTCOLB-MARITAL", "OTCOLB-NONMARITAL", "DEATH_ONTIME", "MARRIAGE_ONTIME", "MARRIAGE_DELAYED", "MARRIAGE_LICENSE", "CTC_ISSUANCE"])("office collection for %s", (code) => {
  it("waits for cashier confirmation on a free request", () => {
    const email=buildStatusChangeEmail("ready_for_release","TEST",null,code,{paymentStatus:"unpaid",feesDue:0});
    expect(email.text).toContain("Please wait for the cashier to confirm that no payment is required.");
    expect(email.text).not.toContain("ready to be claimed");
  });
  it("asks for the actual fee before collection", () => {
    expect(buildStatusChangeEmail("ready_for_release","TEST",null,code,{paymentStatus:"unpaid",feesDue:150}).text)
      .toContain("Please pay ₱150.00 at the CCRO cashier.");
  });
  it("allows collection after cashier clearance", () => {
    expect(buildStatusChangeEmail("ready_for_release","TEST",null,code,{paymentStatus:"verified",feesDue:0}).text).toContain(READY_TO_CLAIM);
  });
  it("confirms handover once released", () => {
    const email=buildStatusChangeEmail("released","TEST",null,code);
    expect(email.text).toContain(DOCUMENT_RELEASED);
    expect(email.text).not.toContain("Please claim");
  });
});

it("sends a ready-to-claim message after cashier clearance",()=>{
  expect(buildCashierClearedEmail("TEST").subject).toContain("Ready for Release");
  expect(buildCashierClearedEmail("TEST").subject).not.toContain("Ready to Claim");
  expect(buildCashierClearedEmail("TEST").text).toContain(READY_TO_CLAIM);
  expect(readyForReleaseInstruction("verified",150)).toBe(READY_TO_CLAIM);
});

it("keeps online inquiries in the message thread",()=>{
  const email=buildStatusChangeEmail("ready_for_release","TEST",null,"EMAIL_INQUIRY",{paymentStatus:"unpaid",feesDue:0});
  expect(email.text).toContain("Read CCRO's reply in the messages.");
  expect(email.text).not.toContain("cashier");
  expect(buildStatusChangeEmail("released","TEST",null,"EMAIL_INQUIRY").text).toContain("Keep CCRO's reply for your records.");
});
