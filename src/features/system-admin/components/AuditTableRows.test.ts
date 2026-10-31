import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useTable } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import { auditColumns } from "./AuditColumn";
import { AuditTableRows } from "./AuditTableRows";
import type { NormalizedAuditEvent } from "../system-admin.types";
import { appTableFeatures } from "~/lib/table";

function AuditRowsPreview({ count }: { count: number }) {
  const data: NormalizedAuditEvent[] = Array.from(
    { length: count },
    (_, index) => ({
      id: String(index),
      source: "system",
      eventType: "health_check_run",
      actorId: "admin",
      actor: `Administrator ${index}`,
      targetId: null,
      requestId: null,
      timestamp: "2026-10-26T00:30:57Z",
      deviceLabel: "Chrome on Windows",
      maskedIpAddress: "127.0.0.0",
    }),
  );
  const table = useTable({
    features: appTableFeatures,
    data,
    columns: auditColumns,
    manualPagination: true,
  });
  return createElement(
    "table",
    null,
    createElement(AuditTableRows, { rows: table.getRowModel().rows }),
  );
}

describe("audit table rendering", () => {
  it("keeps small lists fully rendered in their existing table layout", () => {
    const html = renderToStaticMarkup(
      createElement(AuditRowsPreview, { count: 5 }),
    );
    expect(html.match(/data-slot="table-row"/g)).toHaveLength(5);
    expect(html).toContain("Administrator 4");
    expect(html).not.toContain("data-index");
  });

  it("bounds the initial rendered rows for large cached lists and keeps their scroll space", () => {
    const html = renderToStaticMarkup(
      createElement(AuditRowsPreview, { count: 3000 }),
    );
    const count = [...html.matchAll(/data-slot="table-row"/g)].length;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(50);
    expect(html).toContain('aria-rowindex="2"');
    const heights = [...html.matchAll(/height:(\d+)px/g)].map((match) =>
      Number(match[1]),
    );
    expect(Math.max(...heights)).toBeGreaterThan(200_000);
  });
});
