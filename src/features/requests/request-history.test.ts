import { describe, expect, it } from "vitest";
import {
  buildHistory,
  parseDocumentLog,
  shortRequirementName,
  type LogEntry,
} from "./request-history";

// Office time (UTC+8), so the day boundaries hold whatever zone the machine runs in.
const NOW = new Date("2026-10-23T12:00:00+08:00");
const two = (value: number) => String(value).padStart(2, "0");
const office = (day: number, hour: number, minute: number, month = "10", year = 2026) =>
  new Date(`${year}-${month}-${two(day)}T${two(hour)}:${two(minute)}:00+08:00`).toISOString();
let seq = 0;

/** A log written at `day` Oct 2026, `hour:minute` local time. */
function log(
  actionStatus: string,
  remarks: string | null,
  day: number,
  hour: number,
  minute: number,
  actorName = "CCRO Admin",
): LogEntry {
  seq += 1;
  return {
    id: `log-${seq}`,
    actionStatus,
    remarks,
    createdAt: office(day, hour, minute),
    actorName,
  };
}

const approve = (name: string, hour: number, minute: number, day = 23, actor?: string) =>
  log("document_approved", `Approved "${name}".`, day, hour, minute, actor);

describe("shortening a requirement name", () => {
  it("cuts at the first comma", () => {
    expect(shortRequirementName("Valid ID, 1 photocopy with signature")).toBe("Valid ID");
    expect(
      shortRequirementName(
        "Marriage Contract of parents, 1 certified copy — for a marital child; secure from PSA",
      ),
    ).toBe("Marriage Contract of parents");
  });

  it("cuts at a spaced dash when it comes before any comma", () => {
    expect(
      shortRequirementName(
        "Duly Accomplished Certificate of Live Birth (4 copies) — secure from the hospital, lying-in",
      ),
    ).toBe("Duly Accomplished Certificate of Live Birth (4 copies)");
  });

  it("leaves a plain name alone", () => {
    expect(shortRequirementName("Birth Certificate")).toBe("Birth Certificate");
    expect(shortRequirementName("")).toBe("");
  });
});

describe("reading a document log", () => {
  it("reads an approval", () => {
    expect(parseDocumentLog("document_approved", 'Approved "Valid ID, 1 photocopy".')).toEqual({
      kind: "approved",
      name: "Valid ID, 1 photocopy",
      reason: null,
    });
  });

  it("reads a rejection with its reason", () => {
    expect(
      parseDocumentLog("document_rejected", 'Rejected "Valid ID": The file is blurry.'),
    ).toEqual({ kind: "rejected", name: "Valid ID", reason: "The file is blurry." });
  });

  it("reads a reopened decision with its reason", () => {
    expect(
      parseDocumentLog(
        "document_reverted",
        'Reopened "Valid ID" (was approved): Wrong person on the ID.',
      ),
    ).toEqual({ kind: "reopened", name: "Valid ID", reason: "Wrong person on the ID." });
  });

  it("reads an applicant resubmission", () => {
    expect(
      parseDocumentLog(
        "document_resubmitted",
        'Applicant resubmitted "Valid ID" after rejection.',
      ),
    ).toEqual({ kind: "resubmitted", name: "Valid ID", reason: null });
  });

  it("ignores a status log", () => {
    expect(parseDocumentLog("processing", "Requirements validated.")).toBeNull();
  });

  it("still names a document log whose text it cannot read", () => {
    expect(parseDocumentLog("document_approved", "something odd")).toEqual({
      kind: "approved",
      name: "a document",
      reason: null,
    });
  });
});

describe("building the history", () => {
  it("puts the newest day and the newest event first", () => {
    const days = buildHistory(
      [
        log("submitted", "Request submitted.", 22, 9, 0, "Ana"),
        log("under_validation", null, 23, 8, 30),
        log("processing", null, 23, 9, 0),
      ],
      240,
      NOW,
    );

    expect(days.map((day) => day.label)).toEqual(["Today", "Yesterday"]);
    expect(days[0].items.map((item) => (item.kind === "event" ? item.event.status : "run"))).toEqual([
      "processing",
      "under_validation",
    ]);
  });

  it("counts events per day, including those folded into a run", () => {
    const [day] = buildHistory(
      [approve("Valid ID", 8, 32), approve("Birth Certificate", 8, 33), approve("Marriage Contract", 8, 35)],
      0,
      NOW,
    );

    expect(day.count).toBe(3);
    expect(day.items).toHaveLength(1);
  });

  it("folds a run of approvals by one person into one item, newest first", () => {
    const [day] = buildHistory(
      [approve("Valid ID, 1 copy", 8, 32), approve("Birth Certificate", 8, 33)],
      0,
      NOW,
    );
    const [item] = day.items;

    expect(item.kind).toBe("run");
    if (item.kind !== "run") return;
    expect(item.actor).toBe("CCRO Admin");
    expect(item.events.map((event) => event.document?.name)).toEqual([
      "Birth Certificate",
      "Valid ID",
    ]);
  });

  it("keeps a single approval as a plain event", () => {
    const [day] = buildHistory([approve("Valid ID", 8, 32)], 0, NOW);

    expect(day.items[0].kind).toBe("event");
  });

  it("never folds a rejection into a run", () => {
    const [day] = buildHistory(
      [
        approve("Valid ID", 8, 32),
        log("document_rejected", 'Rejected "Birth Certificate": Cut off.', 23, 8, 33),
        approve("Marriage Contract", 8, 34),
      ],
      0,
      NOW,
    );

    expect(day.items.map((item) => item.kind)).toEqual(["event", "event", "event"]);
  });

  it("does not fold approvals by different people", () => {
    const [day] = buildHistory(
      [approve("Valid ID", 8, 32, 23, "Rosa"), approve("Birth Certificate", 8, 33, 23, "Mia")],
      0,
      NOW,
    );

    expect(day.items.map((item) => item.kind)).toEqual(["event", "event"]);
  });

  it("does not fold approvals split by another event", () => {
    const [day] = buildHistory(
      [
        approve("Valid ID", 8, 32),
        log("under_validation", null, 23, 8, 33),
        approve("Birth Certificate", 8, 34),
      ],
      0,
      NOW,
    );

    expect(day.items.map((item) => item.kind)).toEqual(["event", "event", "event"]);
  });

  it("does not fold approvals across midnight", () => {
    const days = buildHistory(
      [approve("Valid ID", 23, 58, 22), approve("Birth Certificate", 0, 2, 23)],
      0,
      NOW,
    );

    expect(days).toHaveLength(2);
    expect(days.every((day) => day.items[0].kind === "event")).toBe(true);
  });

  it("marks routine progress and acceptances quiet, the rest important", () => {
    const [day] = buildHistory(
      [
        log("submitted", null, 23, 8, 0, "Ana"),
        log("under_validation", null, 23, 8, 1),
        approve("Valid ID", 8, 2),
        log("document_rejected", 'Rejected "Birth Certificate": Cut off.', 23, 8, 3),
        log("incomplete", "Birth Certificate: Cut off.", 23, 8, 4),
        log("processing", null, 23, 8, 5),
        log("released", null, 23, 8, 6),
      ],
      240,
      NOW,
    );
    const important = day.items.flatMap((item) =>
      item.kind === "event" ? [[item.event.status, item.event.important] as const] : [],
    );

    expect(important.reverse()).toEqual([
      ["submitted", false],
      ["under_validation", false],
      ["document_approved", false],
      ["document_rejected", true],
      ["incomplete", true],
      ["processing", true],
      ["released", true],
    ]);
  });

  it("keeps a note staff typed and drops the canned one", () => {
    const [day] = buildHistory(
      [
        log("submitted", "Request submitted.", 23, 8, 0, "Ana"),
        log("incomplete", "Birth Certificate: The file is blurry.", 23, 8, 5),
      ],
      240,
      NOW,
    );
    const notes = day.items.map((item) => (item.kind === "event" ? item.event.note : "run"));

    expect(notes).toEqual(["Birth Certificate: The file is blurry.", null]);
  });

  it("drops the generic 'Advanced from' remark", () => {
    const [day] = buildHistory([log("processing", "Advanced from under_validation.", 23, 8, 5)], 240, NOW);
    const [item] = day.items;

    expect(item.kind === "event" && item.event.note).toBeNull();
  });

  it("says a fee-free request was confirmed by the cashier, not that payment was verified", () => {
    const [free] = buildHistory(
      [log("payment_verified", "Fee-free request confirmed by cashier — no payment due.", 23, 8, 36, "CCRO Cashier")],
      0,
      NOW,
    );
    const [paid] = buildHistory(
      [log("payment_verified", "Payment verified against OR 004217.", 23, 8, 36, "CCRO Cashier")],
      240,
      NOW,
    );
    const freeEvent = free.items[0].kind === "event" ? free.items[0].event : null;
    const paidEvent = paid.items[0].kind === "event" ? paid.items[0].event : null;

    expect(freeEvent).toMatchObject({ kind: "payment", label: "confirmed no fee is due", note: null });
    expect(paidEvent).toMatchObject({
      kind: "payment",
      label: "verified payment",
      note: "Payment verified against OR 004217.",
    });
  });

  it("reads who acted and falls back to System", () => {
    const [day] = buildHistory(
      [
        { id: "a", actionStatus: "submitted", createdAt: office(23, 8, 0) },
        log("under_validation", null, 23, 8, 30, "Rosa"),
      ],
      0,
      NOW,
    );
    const actors = day.items.map((item) => (item.kind === "event" ? item.event.actor : ""));

    expect(actors).toEqual(["Rosa", "System"]);
  });

  it("shows a resubmission as an important event with the document and no note", () => {
    const [day] = buildHistory(
      [
        log(
          "document_resubmitted",
          'Applicant resubmitted "Valid ID, 1 photocopy" after rejection.',
          23,
          9,
          0,
          "Applicant",
        ),
      ],
      0,
      NOW,
    );
    const [item] = day.items;

    expect(item.kind === "event" && item.event).toMatchObject({
      kind: "resubmitted",
      important: true,
      tone: "warning",
      document: { name: "Valid ID", full: "Valid ID, 1 photocopy" },
    });
  });

  it("labels older days by date, adding the year only when it differs", () => {
    const days = buildHistory(
      [
        { id: "x", actionStatus: "submitted", createdAt: office(30, 9, 0, "12", 2025) },
        log("submitted", null, 10, 9, 0),
      ],
      0,
      NOW,
    );

    expect(days.map((day) => day.label)).toEqual(["Oct 10", "Dec 30, 2025"]);
  });

  it("returns nothing for no logs", () => {
    expect(buildHistory([], 0, NOW)).toEqual([]);
  });
});
