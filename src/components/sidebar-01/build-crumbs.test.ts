import { describe, expect, it } from "vitest";
import { buildCrumbs } from "./build-crumbs";

const at = (path: string, loaderData?: unknown) => [
  { routeId: "/_authed" },
  { routeId: "/_authed/_dashboard" },
  { routeId: `/_authed/_dashboard${path}`, loaderData },
];

describe("buildCrumbs", () => {
  it("puts the workspace before a top-level page", () => {
    expect(buildCrumbs("admin", at("/admin/services"))).toEqual([
      { label: "CCRO Administration", to: "/dashboard" },
      { label: "Services Registry" },
    ]);
  });

  it("links a parent section ahead of a flat child route", () => {
    expect(buildCrumbs("admin", at("/admin/services_/blocks"))).toEqual([
      { label: "CCRO Administration", to: "/dashboard" },
      { label: "Services Registry", to: "/admin/services" },
      { label: "Shared Question Blocks" },
    ]);
  });

  it("ends a request on its tracking number", () => {
    expect(
      buildCrumbs("staff", at("/requests/$requestId", { trackingNumber: "CC-2026-00412" })),
    ).toEqual([
      { label: "CCRO Workspace", to: "/dashboard" },
      { label: "Request Queue", to: "/requests" },
      { label: "CC-2026-00412" },
    ]);
  });

  it("falls back to a plain label while the request has no tracking number", () => {
    const crumbs = buildCrumbs("staff", at("/requests/$requestId", undefined));
    expect(crumbs.at(-1)).toEqual({ label: "Request" });
  });

  it("names pages the way the sidebar does for the role", () => {
    expect(buildCrumbs("staff", at("/staff-dashboard")).at(-1)?.label).toBe("Staff Dashboard");
    expect(buildCrumbs("staff", at("/(service)/services")).at(-1)?.label).toBe("Service Reference");
  });

  it("does not repeat the workspace name when the page shares it", () => {
    expect(buildCrumbs("cashier", at("/cashier"))).toEqual([{ label: "Cashier Counter" }]);
  });

  it("uses the deepest page that has a trail", () => {
    const matches = [...at("/admin/"), { routeId: "/_authed/_dashboard/admin/services" }];
    expect(buildCrumbs("admin", matches).at(-1)?.label).toBe("Services Registry");
  });

  it("returns nothing for pages without a trail", () => {
    expect(buildCrumbs("admin", at("/admin/services_/new"))).toEqual([]);
    expect(buildCrumbs("admin", [{ routeId: "/_authed/apply/$serviceCode/details" }])).toEqual([]);
  });
});
