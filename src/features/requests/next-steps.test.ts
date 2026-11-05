import { onTimeRegistrationNotice } from "./on-time-registration";
import { readyForReleaseInstruction } from "~/features/services/release-instructions";
import { describe, expect, it, vi } from "vitest";
import { nextSteps } from "./next-steps";

const ready = (over: { feesDue: number; paymentStatus: string | null; allowsMessages?: boolean }) =>
  nextSteps({
    status: "ready_for_release",
    allowsMessages: false,
    attachments: [],
    logs: [],
    ...over,
  });

describe("what to do next once a request is ready for release", () => {
  it("adds bringing the fee, with the amount, when one is owed", () => {
    expect(ready({ feesDue: 150, paymentStatus: "unpaid" })).toEqual({
      kind: "steps",
      steps: [
        "Please pay ₱150.00 at the CCRO cashier.",
      ],
    });
  });

  it("waits for the cashier to confirm a free request", () => {
    expect(ready({ feesDue: 0, paymentStatus: "unpaid" })).toEqual({
      kind: "steps",
      steps: ["Please wait for the cashier to confirm that no payment is required."],
    });
  });

  it("does not mention payment once the cashier has verified it", () => {
    expect(ready({ feesDue: 150, paymentStatus: "verified" })).toEqual({
      kind: "steps",
      steps: ["Your document is ready to be claimed from the CCRO staff."],
    });
  });

  it("tells the applicant not to visit while staff are still working", () => {
    for (const status of ["submitted"]) {
      expect(
        nextSteps({
          status,
          paymentStatus: "unpaid",
          feesDue: 150,
          allowsMessages: false,
          attachments: [],
          logs: [],
        }),
      ).toEqual({
        kind: "line",
        text: "No need to visit yet. Your uploaded requirements are awaiting staff review.",
      });
    }
  });

  it.each(["MARRIAGE_DELAYED", "MARRIAGE_ONTIME", "BIRTH_ONTIME", "OTCOLB-MARITAL", "OTCOLB-NONMARITAL", "DEATH_ONTIME", "EMAIL_INQUIRY", "CTC", undefined])("sends a processing applicant to the office with hard copies for %s", (serviceCode) => {
    expect(
      nextSteps({
        status: "processing",
        serviceCode,
        postingStartDate: "2026-11-01",
        paymentStatus: "unpaid",
        feesDue: 0,
        allowsMessages: serviceCode === "EMAIL_INQUIRY",
        attachments: [],
        logs: [],
      }),
    ).toEqual({
      kind: "steps",
      ...(onTimeRegistrationNotice(serviceCode)
        ? { registrationNotice: onTimeRegistrationNotice(serviceCode) }
        : {}),
      steps: [
        "Go to the CCRO office for final validation",
        "Bring your original documents and hard copies of your requirements",
        "Bring your tracking number (a printout of your acknowledgment, or write it down)",
      ],
    });
  });

  it("sends an inquiry to the messages, with no visit and no money", () => {
    expect(ready({ feesDue: 150, paymentStatus: "unpaid", allowsMessages: true })).toEqual({
      kind: "steps",
      steps: ["Read CCRO's reply in the messages"],
    });
  });
});

describe("on-time registration deadline", () => {
  it.each([
    ["DEATH_ONTIME", undefined, "2026-12-04", "2026-12-05", "2026-12-06"],
    ["MARRIAGE_ONTIME", "with_license", "2026-11-19", "2026-11-20", "2026-11-21"],
    ["MARRIAGE_ONTIME", "article_34", "2026-12-04", "2026-12-05", "2026-12-06"],
    ["MARRIAGE_ONTIME", "pd_1083", "2026-12-04", "2026-12-05", "2026-12-06"],
  ])("keeps the correct deadline at processing and release for %s (%s)",
    (serviceCode, basis, dayBefore, deadline, dayAfter) => {
      vi.useFakeTimers();
      try {
        for (const status of ["processing", "ready_for_release"]) {
          for (const [today, expected] of [
            [dayBefore, "1 day left"],
            [deadline, "due today"],
            [dayAfter, "deadline has passed"],
          ]) {
            vi.setSystemTime(new Date(`${today}T12:00:00+08:00`));
            const result = nextSteps({
              status, serviceCode,
              formData: { event_date: "2026-11-05", marriage_license_basis: basis },
              feesDue: 0, paymentStatus: "unpaid", allowsMessages: false,
              attachments: [], logs: [],
            });
            expect(result?.kind).toBe("steps");
            if (result?.kind !== "steps") throw new Error("Expected office instructions");
            expect(result.registrationNotice).toContain(expected);
          }
        }
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it.each(["BIRTH_ONTIME", "OTCOLB-MARITAL", "OTCOLB-NONMARITAL", "MARRIAGE_ONTIME", "DEATH_ONTIME"])(
    "keeps the countdown alongside processing and release instructions for %s",
    (serviceCode) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-11T12:00:00+08:00"));
      try {
        for (const status of ["processing", "ready_for_release"]) {
          for (const payment of [
            { feesDue: 0, paymentStatus: "unpaid" },
            { feesDue: 150, paymentStatus: "unpaid" },
            { feesDue: 150, paymentStatus: "verified" },
          ]) {
            const result = nextSteps({
              status,
              serviceCode,
              formData: { event_date: "2026-11-05", marriage_license_basis: "with_license" },
              ...payment,
              allowsMessages: false,
              attachments: [],
              logs: [],
            });
            expect(result?.kind).toBe("steps");
            if (result?.kind !== "steps") throw new Error("Expected office instructions");
            expect(result.registrationNotice).toContain(
              serviceCode === "MARRIAGE_ONTIME" ? "9 days left" : "24 days left",
            );
            expect(result.steps).toContain(status === "processing"
              ? "Go to the CCRO office for final validation"
              : readyForReleaseInstruction(payment.paymentStatus, payment.feesDue));
          }
        }
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it.each(["BIRTH_ONTIME", "OTCOLB-MARITAL", "OTCOLB-NONMARITAL", "MARRIAGE_ONTIME", "DEATH_ONTIME"])(
    "keeps the CCRO deadline visible for %s after submission",
    (serviceCode) => {
      for (const status of ["submitted"]) {
        expect(nextSteps({
          status,
          serviceCode,
          paymentStatus: "unpaid",
          feesDue: 0,
          allowsMessages: false,
          attachments: [],
          logs: [],
        })).toEqual({ kind: "line", text: onTimeRegistrationNotice(serviceCode) });
      }
    },
  );
});

describe("under validation instructions", () => {
  it.each([
    ["CTC", false, "your uploaded documents"],
    ["MARRIAGE_DELAYED", false, "your uploaded documents"],
    ["BIRTH_ONTIME", false, "your uploaded documents"],
    ["EMAIL_INQUIRY", true, "your inquiry"],
  ] as const)("uses suitable wording for %s", (serviceCode, allowsMessages, subject) => {
    const result = nextSteps({
      status: "under_validation",
      serviceCode,
      allowsMessages,
      paymentStatus: "unpaid",
      feesDue: 0,
      attachments: [],
      logs: [],
    });
    expect(result?.kind).toBe("line");
    if (result?.kind !== "line") return;
    expect(result.text).toContain(`CCRO is currently reviewing ${subject}.`);
    expect(result.text).toContain("notify you of updates or needed corrections.");
    const notice = onTimeRegistrationNotice(serviceCode);
    if (notice) expect(result.text).toContain(notice);
  });
});
