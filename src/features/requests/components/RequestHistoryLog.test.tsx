import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LogEntry } from "~/features/requests/request-history";
import { RequestHistoryLog } from "./RequestHistoryLog";

const at = (hour: number, minute: number) =>
  new Date(`2026-10-01T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+08:00`).toISOString();

function logs(): LogEntry[] {
  return [
    { id: "1", actionStatus: "submitted", remarks: "Request submitted.", createdAt: at(8, 9), actorName: "Ana" },
    { id: "2", actionStatus: "under_validation", remarks: null, createdAt: at(8, 32), actorName: "CCRO Admin" },
    {
      id: "3",
      actionStatus: "document_approved",
      remarks: 'Approved "Valid ID, 1 photocopy with signature".',
      createdAt: at(8, 32),
      actorName: "CCRO Admin",
    },
    {
      id: "4",
      actionStatus: "document_approved",
      remarks: 'Approved "Information Sheet, original copy — secure from the hospital".',
      createdAt: at(8, 35),
      actorName: "CCRO Admin",
    },
    {
      id: "5",
      actionStatus: "document_rejected",
      remarks: 'Rejected "Marriage Contract of parents, 1 certified copy": Cut off.',
      createdAt: at(8, 36),
      actorName: "CCRO Admin",
    },
    {
      id: "6",
      actionStatus: "payment_verified",
      remarks: "Fee-free request confirmed by cashier — no payment due.",
      createdAt: at(8, 36),
      actorName: "CCRO Cashier",
    },
  ];
}

describe("the staff history log", () => {
  const html = renderToStaticMarkup(<RequestHistoryLog logs={logs()} feesDue={0} />);

  it("folds the two acceptances into one line and keeps the rejection with its reason", () => {
    expect(html).toContain("accepted 2 documents");
    expect(html).toContain("Marriage Contract of parents");
    expect(html).toContain("Cut off.");
  });

  it("shows short names with the full requirement in a tooltip", () => {
    expect(html).toContain('title="Marriage Contract of parents, 1 certified copy"');
  });

  it("says the cashier confirmed no fee for a fee-free request", () => {
    expect(html).toContain("confirmed no fee is due");
    expect(html).not.toContain("verified payment");
  });

  it("states the event count and says it is newest first", () => {
    expect(html).toContain("6 events, newest first");
  });

  it("has a friendly empty state", () => {
    expect(renderToStaticMarkup(<RequestHistoryLog logs={[]} feesDue={0} />)).toContain(
      "Nothing has happened yet.",
    );
  });
});
