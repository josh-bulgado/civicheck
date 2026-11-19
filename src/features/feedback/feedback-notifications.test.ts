import { describe, expect, it, vi } from "vitest";
vi.mock("~/utils/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("~/utils/app-url", () => ({
  getAppUrl: () => "https://civicheck.example.test",
}));
import { buildStatusChangeEmail } from "~/features/notifications/notifications.server";

describe("completion feedback invitation", () => {
  it("includes an optional authenticated survey link in the release email", () => {
    const result = buildStatusChangeEmail(
      "released",
      "TEST",
      null,
      "CTC-LOCAL",
      undefined,
      "request-id",
    );
    expect(result.html).toContain(
      'href="https://civicheck.example.test/my-requests/request-id?feedback=true"',
    );
    expect(result.text).toContain("optional feedback");
  });
  it("does not invite feedback before the service is completed", () => {
    expect(
      buildStatusChangeEmail(
        "ready_for_release",
        "TEST",
        null,
        "CTC-LOCAL",
        undefined,
        "request-id",
      ).html,
    ).not.toContain("feedback=true");
  });
  it("also invites feedback for completed online inquiries", () => {
    const result = buildStatusChangeEmail(
      "released",
      "TEST",
      null,
      "EMAIL_INQUIRY",
      undefined,
      "request-id",
    );
    expect(result.html).toContain("feedback=true");
    expect(result.text).toContain("Keep CCRO's reply");
  });
});
