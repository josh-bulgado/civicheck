import { describe, expect, it } from "vitest";
import {
  buildIncompleteNote,
  describeRequestProgress,
  planRequestActions,
  type RequestActionInput,
} from "./request-actions";

const doc = (verificationStatus: string) => ({ verificationStatus });

function input(overrides: Partial<RequestActionInput> = {}): RequestActionInput {
  return {
    status: "under_validation",
    paymentStatus: "unpaid",
    feesDue: 240,
    canProcess: true,
    attachments: [],
    ...overrides,
  };
}

describe("planning the actions on a request", () => {
  it("completes email inquiries online while keeping the cashier gate", () => {
    const pending = input({serviceCode: "EMAIL_INQUIRY", status: "ready_for_release", feesDue: 0});
    expect(planRequestActions(pending).primary).toMatchObject({
      label: "Complete inquiry", dialog: "release", to: "released",
      blocked: "Waiting for the cashier to confirm this fee-free request",
    });
    const ready = {...pending, paymentStatus: "verified"};
    expect(planRequestActions(ready).primary?.blocked).toBeUndefined();
    expect(describeRequestProgress(ready)).toContain("Complete the inquiry online");
  });

  it("holds release while a document is not accepted", () => {
    const ready = planRequestActions(
      input({ status: "processing", attachments: [doc("approved"), doc("pending")] }),
    );
    expect(ready.primary).toMatchObject({ to: "ready_for_release", blocked: "1 document still needs a decision" });

    const release = planRequestActions(
      input({
        status: "ready_for_release",
        paymentStatus: "verified",
        attachments: [doc("rejected")],
      }),
    );
    expect(release.primary).toMatchObject({ to: "released", blocked: "1 rejected document to resolve first" });
  });

  it("offers nothing to a role that can only view", () => {
    const plan = planRequestActions(input({ canProcess: false }));

    expect(plan.primary).toBeNull();
    expect(plan.reject).toBeNull();
    expect(plan.notice).toMatch(/view this request but not advance/);
  });

  it("offers nothing once a request has ended", () => {
    for (const status of ["released", "rejected"]) {
      const plan = planRequestActions(input({ status }));
      expect(plan.primary).toBeNull();
      expect(plan.notice).toMatch(/Nothing further to do/);
    }
  });

  it("starts validation from submitted, with reject kept apart", () => {
    const plan = planRequestActions(input({ status: "submitted" }));

    expect(plan.primary?.to).toBe("under_validation");
    expect(plan.primary?.blocked).toBeUndefined();
    expect(plan.reject?.to).toBe("rejected");
    expect(plan.reject?.dialog).toBe("reject");
    expect(plan.secondary).toEqual([]);
  });

  it("keeps requirements-complete visible but blocked while documents are pending", () => {
    const plan = planRequestActions(
      input({ attachments: [doc("approved"), doc("pending"), doc("pending")] }),
    );

    expect(plan.primary?.to).toBe("processing");
    expect(plan.primary?.blocked).toBe("2 documents still need a decision");
    expect(plan.secondary.map((a) => a.to)).toEqual(["incomplete"]);
  });

  it("uses the singular for one pending document", () => {
    const plan = planRequestActions(input({ attachments: [doc("pending")] }));
    expect(plan.primary?.blocked).toBe("1 document still needs a decision");
  });

  it("lets requirements be completed once every document is accepted", () => {
    const plan = planRequestActions(
      input({ attachments: [doc("approved"), doc("approved")] }),
    );

    expect(plan.primary?.to).toBe("processing");
    expect(plan.primary?.blocked).toBeUndefined();
  });

  it("lets requirements be completed when nothing was pre-uploaded", () => {
    const plan = planRequestActions(input({ attachments: [] }));
    expect(plan.primary?.blocked).toBeUndefined();
  });

  it("makes marking incomplete the main step when a document is rejected", () => {
    const plan = planRequestActions(
      input({ attachments: [doc("approved"), doc("rejected")] }),
    );

    expect(plan.primary?.to).toBe("incomplete");
    expect(plan.primary?.dialog).toBe("incomplete");
    const complete = plan.secondary.find((a) => a.to === "processing");
    expect(complete?.blocked).toBe("1 rejected document to resolve first");
  });

  it("resumes validation from incomplete", () => {
    const plan = planRequestActions(input({ status: "incomplete" }));
    expect(plan.primary?.to).toBe("under_validation");
    expect(plan.primary?.label).toBe("Start validation");
  });

  it("moves processing to ready for release and words the way back as a return", () => {
    const plan = planRequestActions(input({ status: "processing" }));

    expect(plan.primary?.to).toBe("ready_for_release");
    expect(plan.secondary).toHaveLength(1);
    expect(plan.secondary[0]).toMatchObject({
      to: "under_validation",
      label: "Return to validation",
    });
  });

  it("blocks release until the cashier has verified payment", () => {
    const plan = planRequestActions(
      input({ status: "ready_for_release", paymentStatus: "unpaid" }),
    );

    expect(plan.primary?.to).toBe("released");
    expect(plan.primary?.blocked).toBe("Waiting for the cashier to verify payment");
    expect(plan.reject).toBeNull();
  });

  it("words the wait differently for a fee-free request", () => {
    const plan = planRequestActions(
      input({
        status: "ready_for_release",
        paymentStatus: "unpaid",
        feesDue: 0,
      }),
    );

    expect(plan.primary?.blocked).toBe(
      "Waiting for the cashier to confirm this fee-free request",
    );
  });

  it("opens release for any role that can process once payment is verified, behind a dialog", () => {
    const plan = planRequestActions(
      input({ status: "ready_for_release", paymentStatus: "verified" }),
    );

    expect(plan.primary?.blocked).toBeUndefined();
    expect(plan.primary?.dialog).toBe("release");
  });
});

describe("describing where a request stands", () => {
  it("counts documents while validation is open", () => {
    expect(
      describeRequestProgress(
        input({ attachments: [doc("approved"), doc("pending"), doc("rejected")] }),
      ),
    ).toBe("1 accepted · 1 pending · 1 rejected");
  });

  it("leaves the originals for release once every upload is accepted", () => {
    const line = describeRequestProgress(input({ attachments: [doc("approved")] }));
    expect(line).toMatch(/Mark requirements complete/);
    expect(line).toMatch(/at release/);
    expect(line).not.toMatch(/counter/);
  });

  it("says so when an online request had nothing to pre-check", () => {
    expect(describeRequestProgress(input({ attachments: [] }))).toMatch(
      /Nothing was uploaded.*at release/,
    );
  });

  it("keeps a walk-in's check at the counter", () => {
    expect(describeRequestProgress(input({ isWalkIn: true }))).toMatch(/at the counter/);
    expect(
      describeRequestProgress(input({ status: "incomplete", isWalkIn: true })),
    ).toMatch(/bring/);
    expect(describeRequestProgress(input({ status: "incomplete" }))).toMatch(/upload/);
  });

  it("does not claim payment can be taken before release", () => {
    expect(describeRequestProgress(input({ status: "processing" }))).not.toMatch(
      /pay/i,
    );
  });

  it("follows payment once the request is ready for release", () => {
    const base = input({ status: "ready_for_release" });
    expect(describeRequestProgress({ ...base, paymentStatus: "unpaid" })).toMatch(
      /Waiting for the cashier/,
    );
    expect(describeRequestProgress({ ...base, paymentStatus: "verified" })).toMatch(
      /hand over the document/,
    );
    expect(
      describeRequestProgress({
        ...base,
        paymentStatus: "verified",
        attachments: [doc("approved")],
      }),
    ).toMatch(/match the originals to the uploads/);
  });
});

describe("drafting the incomplete notice", () => {
  it("lists only the rejected documents with their reasons", () => {
    expect(
      buildIncompleteNote([
        {
          requirementName: "Valid ID",
          subjectRole: "Father",
          verificationStatus: "rejected",
          rejectionReason: "The file is blurry or unreadable.",
        },
        {
          requirementName: "Marriage certificate",
          subjectRole: null,
          verificationStatus: "approved",
          rejectionReason: null,
        },
        {
          requirementName: "Birth form",
          subjectRole: null,
          verificationStatus: "rejected",
          rejectionReason: null,
        },
      ]),
    ).toBe("Father: Valid ID. The file is blurry or unreadable.\nBirth form");
  });

  it("is empty when nothing was rejected", () => {
    expect(buildIncompleteNote([])).toBe("");
  });
});
