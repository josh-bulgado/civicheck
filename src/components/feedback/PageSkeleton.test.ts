import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  CatalogPageSkeleton,
  DocumentSkeleton,
  EditorPageSkeleton,
  PageSkeleton,
  PanelSkeleton,
  TablePageSkeleton,
} from "./PageSkeleton";
import { CashierCounterSkeleton } from "~/features/cashier/components/CashierCounterSkeleton";
import { LandingPageSkeleton } from "~/features/landing/components/LandingPageSkeleton";
import { SystemHealthSkeleton } from "~/features/system-admin/components/SystemHealthSkeleton";
import { SecurityCenterSkeleton } from "~/features/system-admin/components/SecurityCenterSkeleton";
import { LoginPageSkeleton } from "~/features/auth/components/LoginPageSkeleton";
import { MyRequestsPageSkeleton } from "~/features/requests/pages/MyRequestsPageSkeleton";
import { MyRequestDetailPageSkeleton } from "~/features/requests/pages/MyRequestDetailPageSkeleton";
import { NotificationsPageSkeleton } from "~/features/notifications/pages/NotificationsPageSkeleton";
import { StaffDashboardSkeleton } from "~/features/dashboard/StaffDashboardSkeleton";
import { AdminOverviewSkeleton } from "~/features/admin/overview/components/AdminOverviewSkeleton";
import { AdminReportsSkeleton } from "~/features/admin/reports/components/AdminReportsSkeleton";

vi.mock("~/components/quiet-link", async (importOriginal) => ({
  ...await importOriginal<typeof import("~/components/quiet-link")>(),
  QuietLink: ({ children, to, className }: { children?: ReactNode; to?: string; className?: string }) => createElement("a", { href: to, className }, children),
}));

describe("loading UI", () => {
  it.each([
    ["page", PageSkeleton],
    ["table", TablePageSkeleton],
    ["catalog", CatalogPageSkeleton],
    ["editor", EditorPageSkeleton],
    ["panel", PanelSkeleton],
    ["document", DocumentSkeleton],
    ["cashier", CashierCounterSkeleton],
    ["landing", LandingPageSkeleton],
    ["system health", SystemHealthSkeleton],
    ["security center", SecurityCenterSkeleton],
  ] as [string, ComponentType][])(
    "announces the %s loading state with decorative skeletons",
    (_name, component) => {
      const html = renderToStaticMarkup(createElement(component));
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toMatch(/aria-label="Loading[^"]*"/);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('data-slot="skeleton"');
      expect(html).not.toContain('data-slot="spinner"');
      expect(html).not.toContain("civic-progress-track");
    },
  );

  it("keeps the sign-in form and artwork visible while session restoration disables submission", () => {
    const html = renderToStaticMarkup(createElement(LoginPageSkeleton));
    for (const text of ["Welcome back", "Email address", "Password", "Sign in", "Continue with Google", "Create an account", "/login/login-documents.webp"]) expect(html).toContain(text);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('data-slot="skeleton"');
  });

  it("keeps portal titles and fixed actions outside the data loading regions", () => {
    for (const [component, title, action] of [
      [MyRequestsPageSkeleton, "My requests", "New request"],
      [() => createElement(NotificationsPageSkeleton, { audience: "applicant" }), "Notifications", "Mark all as read"],
    ] as const) {
      const html = renderToStaticMarkup(createElement(component));
      expect(html).toContain(`<h1 class="portal-title">${title}</h1>`);
      expect(html).toContain(action);
      expect(html.indexOf(`<h1`)).toBeLessThan(html.indexOf('role="status"'));
      expect(html).toContain('data-slot="skeleton"');
      expect(html).not.toContain("No requests yet");
      expect(html).not.toContain("No notifications yet");
    }
  });

  it("keeps request section names readable while their contents load", () => {
    const html = renderToStaticMarkup(createElement(MyRequestDetailPageSkeleton));
    for (const heading of ["What to do next", "Submitted details", "Acknowledgment slip", "Status history", "Documents"]) expect(html).toMatch(new RegExp(`${heading}</h[23]>`));
  });

  it("keeps fixed inner-panel labels while their values and records are pending", () => {
    for (const [component, labels] of [
      [StaffDashboardSkeleton, ["Your Queue by Stage", "Then", "Not Your Move"]],
      [AdminOverviewSkeleton, ["Your Responsibilities", "People", "Services", "Insight", "Requests"]],
      [AdminReportsSkeleton, ["Briefing", "Services", "Report Sheet"]],
      [CashierCounterSkeleton, ["Verified", "Collected", "Awaiting payment at the office", "Tracking number", "Scan QR"]],
      [SystemHealthSkeleton, ["Response time", "Recent activity", "Availability", "Component", "Last checked"]],
    ] as const) {
      const html = renderToStaticMarkup(createElement(component));
      for (const label of labels) expect(html).toContain(label);
      expect(html).toContain('data-slot="skeleton"');
    }
  });
});
