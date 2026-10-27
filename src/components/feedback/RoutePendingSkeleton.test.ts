import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SystemHealthSkeleton } from "~/features/system-admin/components/SystemHealthSkeleton";
import { SecurityCenterSkeleton } from "~/features/system-admin/components/SecurityCenterSkeleton";
import { PageSkeleton } from "./PageSkeleton";
import { RoutePendingSkeleton } from "./RoutePendingSkeleton";

const location = vi.hoisted(() => ({ pathname: "/system-admin/health" }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  useRouterState: ({ select }: { select: (state: { location: typeof location }) => unknown }) => select({ location }),
}));

describe("parent route loading", () => {
  it.each([
    ["/system-admin/health", SystemHealthSkeleton],
    ["/system-admin/security", SecurityCenterSkeleton],
    ["/dashboard", PageSkeleton],
  ])("uses the same page skeleton at %s before parent loaders finish", (pathname, component) => {
    location.pathname = pathname;
    const html = renderToStaticMarkup(createElement(RoutePendingSkeleton));
    expect(html).toContain(renderToStaticMarkup(createElement(component)));
  });
});
