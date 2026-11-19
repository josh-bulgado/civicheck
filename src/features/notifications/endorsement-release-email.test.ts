import { expect, it, vi } from "vitest";
vi.mock("~/utils/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("~/utils/app-url", () => ({ getAppUrl: () => "https://example.test" }));
import { buildCashierClearedEmail, buildStatusChangeEmail } from "./notifications.server";

const details = { endorsedOn:"2026-11-13",claimingLocation:"Confirmed PSA desk",claimingInstructions:"Bring the claim slip.",availableAt:null };
it("uses confirmed claiming details for both readiness and cashier notifications", () => {
  for (const content of [
    buildStatusChangeEmail("ready_for_release","TEST",null,"ELEC_ENDORSEMENT",{paymentStatus:"verified",feesDue:100},undefined,details),
    buildCashierClearedEmail("TEST",details),
  ]) {
    expect(content.text).toContain("Confirmed PSA desk");
    expect(content.text).toContain("Bring the claim slip.");
    expect(content.text).not.toContain("claimed from the CCRO staff");
  }
});
it("escapes staff instructions in HTML email", () => {
  const content = buildCashierClearedEmail("TEST",{...details,claimingInstructions:"<script>alert(1)</script>"});
  expect(content.html).not.toContain("<script>");
  expect(content.html).toContain("&lt;script&gt;");
});
