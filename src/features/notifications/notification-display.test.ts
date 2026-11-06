import { describe, expect, it } from "vitest";
import { feedDetail, feedTitle } from "./notification-display";
import type { NotificationRow } from "./notifications.queries";

function releaseNotice(overrides: Partial<NotificationRow>): NotificationRow {
  return {
    id:"notice",requestId:"request",type:"status_change",archivedAt:null,
    subject:"Request TEST: now Ready for Release",body:"",status:"sent",isRead:false,
    sentAt:"2026-11-05T11:00:00Z",trackingNumber:"TEST",serviceName:null,serviceCode:"CTC_ISSUANCE",
    target:{to:"/my-requests/$requestId",requestId:"request"},...overrides,
  };
}

it("keeps the Ready for Release label after cashier clearance",()=>{
  expect(feedTitle("Request TEST: Ready for Release")).toBe("Ready for Release");
  expect(feedTitle("Request TEST: now Ready to Claim")).toBe("Ready for Release");
});

it("shows collection after cashier verification",()=>{
  expect(feedDetail(releaseNotice({paymentStatus:"verified",feesDue:0}))).toBe("Your document is ready to be claimed from the CCRO staff.");
});
it("shows the fee before cashier verification",()=>{
  expect(feedDetail(releaseNotice({paymentStatus:"unpaid",feesDue:150}))).toBe("Please pay ₱150.00 at the CCRO cashier.");
});
it("replaces old collection instructions after handover and keeps staff notes",()=>{
  expect(feedDetail(releaseNotice({subject:"Request TEST: now Released",body:'Your CiviCheck request TEST is now "Released".\n\nPlease claim your requested document from the CCRO staff.\n\nReceived by the requester.\n\nOpen "My Requests" for the full details.'})))
    .toBe("Your requested document has been released to you. Received by the requester.");
});
it("keeps inquiries online",()=>{
  expect(feedDetail(releaseNotice({serviceCode:"EMAIL_INQUIRY",feesDue:0,paymentStatus:"unpaid"}))).toBe("Read CCRO's reply in the messages.");
});

describe("on-time registration release instructions", () => {
  it("shows the reminder deadline and office instructions", () => {
    const body = 'Your on-time registration deadline is November 20, 2026 (1 day left).\n\nBring your original documents and hard copies to the CCRO office.\n\nOpen "My Requests" for the full details.';
    const notification = { type: "registration_reminder", body } as NotificationRow;
    expect(feedDetail(notification)).toBe('Your on-time registration deadline is November 20, 2026 (1 day left).\n\nBring your original documents and hard copies to the CCRO office.');
  });
  it.each(["BIRTH_ONTIME", "OTCOLB-MARITAL", "OTCOLB-NONMARITAL", "MARRIAGE_ONTIME", "DEATH_ONTIME"])(
    "replaces old payment instructions for %s",
    (serviceCode) => {
      const notification: NotificationRow = {
        id: "notification", requestId: "request", type: "status_change",
        archivedAt: null, subject: "Request TEST: now Ready for Release",
        body: "Pay any outstanding fee at the cashier to claim your document.",
        status: "sent", isRead: false, sentAt: "2026-11-05T11:00:00Z",
        trackingNumber: "TEST", serviceName: null, serviceCode, feesDue: 0, paymentStatus: "unpaid",
        target: { to: "/my-requests/$requestId", requestId: "request" },
      };
      expect(feedDetail(notification)).toBe(
        "Please wait for the cashier to confirm that no payment is required.",
      );
    },
  );
});
