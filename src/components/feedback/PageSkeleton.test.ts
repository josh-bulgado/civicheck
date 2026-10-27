import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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
});
