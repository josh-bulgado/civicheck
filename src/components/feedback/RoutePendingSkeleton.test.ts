import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CitizenPortalFrameSkeleton } from "~/features/dashboard/CitizenPortalFrameSkeleton";
import { SystemHealthSkeleton } from "~/features/system-admin/components/SystemHealthSkeleton";
import { SecurityCenterSkeleton } from "~/features/system-admin/components/SecurityCenterSkeleton";
import type { IdentityHint } from "~/features/auth/current-user";
import { PageSkeleton } from "./PageSkeleton";
import { RoutePendingSkeleton } from "./RoutePendingSkeleton";

const location = vi.hoisted(() => ({ pathname: "/system-admin/health" }));
const known = vi.hoisted(() => ({ hint: null as IdentityHint | null }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  useRouterState: ({ select }: { select: (state: { location: typeof location }) => unknown }) => select({ location }),
}));
vi.mock("~/features/auth/current-user", async (importOriginal) => ({
  ...await importOriginal<typeof import("~/features/auth/current-user")>(),
  peekCurrentUser: () => known.hint,
}));

const render = () => renderToStaticMarkup(createElement(RoutePendingSkeleton));

beforeEach(() => {
  known.hint = null;
});

describe("parent route loading", () => {
  it.each([
    ["/system-admin/health", SystemHealthSkeleton],
    ["/system-admin/security", SecurityCenterSkeleton],
    ["/dashboard", PageSkeleton],
  ])("uses the same page skeleton at %s before parent loaders finish", (pathname, component) => {
    location.pathname = pathname;
    expect(render()).toContain(renderToStaticMarkup(createElement(component)));
  });
});

describe("the applicant's dashboard before parent loaders finish", () => {
  const frame = () => renderToStaticMarkup(createElement(CitizenPortalFrameSkeleton));

  it("draws the applicant's own frame, sidebar and all, for a known applicant", () => {
    location.pathname = "/dashboard";
    known.hint = { id: "u1", role: "applicant" };

    const html = render();
    expect(html).toContain(frame());
    expect(html).toContain("citizen-portal");
    expect(html).not.toContain("data-page-skeleton");
  });

  it.each(["staff", "supervisor", "cashier", "admin", "system_admin"] as const)(
    "keeps the neutral page for a %s, who is sent on from /dashboard",
    (role) => {
      location.pathname = "/dashboard";
      known.hint = { id: "u2", role };

      expect(render()).toContain(renderToStaticMarkup(createElement(PageSkeleton)));
    },
  );

  it("only changes /dashboard", () => {
    location.pathname = "/my-requests";
    known.hint = { id: "u1", role: "applicant" };

    expect(render()).toContain(renderToStaticMarkup(createElement(PageSkeleton)));
  });
});
