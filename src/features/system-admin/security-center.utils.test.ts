import { describe, expect, it } from "vitest";
import {
  describeActivity,
  postureBanner,
  postureMetrics,
  severityBadgeVariant,
} from "./security-center.utils";
import type {
  PrivilegedAccountSecurity,
  SecurityCenterDashboard,
  SecurityPolicyControl,
} from "./system-admin.types";

type Summary = Pick<
  SecurityCenterDashboard,
  | "posture"
  | "openFindingCount"
  | "urgentFindingCount"
  | "failedSignIns24h"
  | "privilegedAccountCount"
  | "privilegedAccounts"
  | "overdueControlCount"
  | "controls"
>;

const account = (isStale = false): PrivilegedAccountSecurity => ({
  id: crypto.randomUUID(),
  name: "Account",
  role: "supervisor",
  status: "active",
  lastSignInAt: null,
  isStale,
});

const control = (nextReviewDueAt: string | null): SecurityPolicyControl => ({
  key: crypto.randomUUID(),
  category: "identity",
  name: "Control",
  description: "",
  status: "enforced",
  evidenceSummary: "",
  lastReviewedAt: null,
  nextReviewDueAt,
  reviewIntervalDays: 90,
});

const base: Summary = {
  posture: "protected",
  openFindingCount: 0,
  urgentFindingCount: 0,
  failedSignIns24h: 0,
  privilegedAccountCount: 4,
  privilegedAccounts: [account(), account(), account(), account()],
  overdueControlCount: 0,
  controls: [control("2026-09-15T00:00:00Z"), control("2026-11-14T00:00:00Z")],
};

describe("posture banner", () => {
  it("is quiet and has no button when nothing is waiting", () => {
    expect(postureBanner(base)).toEqual({
      tone: "ok",
      label: "All clear",
      detail: "No findings or reviews are waiting.",
      action: null,
    });
  });

  it("watches open findings and due reviews together", () => {
    expect(
      postureBanner({
        ...base,
        posture: "watch",
        openFindingCount: 3,
        overdueControlCount: 2,
      }),
    ).toEqual({
      tone: "warn",
      label: "Watch",
      detail: "Findings and policy reviews are waiting.",
      action: { label: "Review findings", tab: "findings" },
    });
  });

  it("sends the reader to the controls when only reviews are due", () => {
    const banner = postureBanner({
      ...base,
      posture: "watch",
      overdueControlCount: 1,
    });
    expect(banner.detail).toBe("Policy reviews are waiting.");
    expect(banner.action).toEqual({ label: "Review controls", tab: "controls" });
  });

  it("names the urgent findings and agrees with a single one", () => {
    const two = postureBanner({
      ...base,
      posture: "attention",
      openFindingCount: 5,
      urgentFindingCount: 2,
    });
    expect(two).toMatchObject({
      tone: "err",
      label: "Urgent",
      detail: "2 urgent findings need action today.",
      action: { label: "Review urgent findings", tab: "findings" },
    });
    expect(
      postureBanner({ ...base, posture: "attention", urgentFindingCount: 1 })
        .detail,
    ).toBe("1 urgent finding needs action today.");
  });
});

describe("posture metrics", () => {
  it("reads the watch state: routine findings, a stray sign-in, reviews due", () => {
    expect(
      postureMetrics({
        ...base,
        openFindingCount: 3,
        failedSignIns24h: 1,
        overdueControlCount: 2,
      }),
    ).toEqual([
      { key: "findings", tone: "warn", title: "3 findings open", detail: "None are urgent" },
      { key: "accounts", tone: "ok", title: "4 privileged accounts", detail: "None are stale" },
      { key: "sign-ins", tone: "neutral", title: "1 rejected sign-in", detail: "In the last 24 hours" },
      { key: "reviews", tone: "warn", title: "2 reviews due", detail: "Policy and credential" },
    ]);
  });

  it("turns every line green when all is clear and names the next review", () => {
    const metrics = postureMetrics(base);
    expect(metrics.map((metric) => metric.tone)).toEqual(["ok", "ok", "ok", "ok"]);
    expect(metrics.map((metric) => metric.title)).toEqual([
      "No open findings",
      "4 privileged accounts",
      "No rejected sign-ins",
      "Reviews up to date",
    ]);
    expect(metrics[3].detail).toBe("Next one on Sep 15");
  });

  it("flags urgent findings, a stale account and a burst of rejected sign-ins", () => {
    const metrics = postureMetrics({
      ...base,
      openFindingCount: 5,
      urgentFindingCount: 2,
      failedSignIns24h: 14,
      privilegedAccounts: [account(true), account(), account(), account()],
      overdueControlCount: 2,
    });
    expect(metrics).toEqual([
      { key: "findings", tone: "err", title: "2 urgent findings", detail: "3 more are open" },
      { key: "accounts", tone: "warn", title: "1 stale account", detail: "Of 4 privileged accounts" },
      { key: "sign-ins", tone: "err", title: "14 rejected sign-ins", detail: "In the last 24 hours" },
      { key: "reviews", tone: "warn", title: "2 reviews due", detail: "Policy and credential" },
    ]);
  });

  it("only warns, not urgent, for a handful of rejected sign-ins", () => {
    expect(postureMetrics({ ...base, failedSignIns24h: 5 })[2].tone).toBe("warn");
    expect(postureMetrics({ ...base, failedSignIns24h: 4 })[2].tone).toBe("neutral");
  });

  it("does not invent a next review date or a count that is not there", () => {
    expect(postureMetrics({ ...base, controls: [] })[3].detail).toBe("Nothing scheduled");
    expect(
      postureMetrics({ ...base, urgentFindingCount: 1, openFindingCount: 1 })[0].detail,
    ).toBe("None others are open");
    expect(
      postureMetrics({ ...base, privilegedAccountCount: 0, privilegedAccounts: [] })[1],
    ).toMatchObject({ tone: "neutral", title: "No privileged accounts" });
  });
});

describe("activity wording", () => {
  it("keeps what is new in each stored sentence", () => {
    expect(
      describeActivity({
        type: "admin_session_started",
        summary: "A privileged administrator session started from Chrome on Windows.",
      }),
    ).toBe("Started from Chrome on Windows");
    expect(
      describeActivity({
        type: "staff_session_started",
        summary: "A CCRO staff session started via email link from Safari on iPhone.",
      }),
    ).toBe("Started via email link from Safari on iPhone");
    expect(
      describeActivity({
        type: "privileged_action",
        summary: "Privileged action recorded: health check run.",
      }),
    ).toBe("Health check run");
    expect(
      describeActivity({
        type: "sign_in_failed",
        summary: "A password sign-in was rejected. No submitted identifier or network address was retained.",
      }),
    ).toBe("Password sign-in was rejected");
  });
});

describe("severity chips", () => {
  it("maps severity to a tone", () => {
    expect(severityBadgeVariant("critical")).toBe("destructive");
    expect(severityBadgeVariant("high")).toBe("destructive");
    expect(severityBadgeVariant("medium")).toBe("warning");
    expect(severityBadgeVariant("low")).toBe("success");
  });
});
