import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import { flexRender } from "@tanstack/react-table";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { TableBody, TableCell, TableRow } from "~/components/ui/table";
import type { NormalizedAuditEvent } from "../system-admin.types";
import type { AppRow } from "~/lib/table";

type AuditRow = AppRow<NormalizedAuditEvent>;

function AuditRowCells({ row }: { row: AuditRow }) {
  return row.getVisibleCells().map((cell) => (
    <TableCell key={cell.id} className="px-6 py-3">
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  ));
}

/** Preserve the native page scrollbar and table layout while bounding DOM work. */
function VirtualAuditTableRows({
  rows,
  rowOffset,
}: {
  rows: AuditRow[];
  rowOffset: number;
}) {
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const getItemKey = useCallback((index: number) => rows[index].id, [rows]);
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 76,
    overscan: 8,
    getItemKey,
    scrollMargin,
    // Paint the first screen during SSR too; actual row heights are measured.
    initialRect: { width: 0, height: 900 },
  });

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const updateOffset = () =>
      setScrollMargin(body.getBoundingClientRect().top + window.scrollY);
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(body.closest(".audit-events-card") ?? body);
    window.addEventListener("resize", updateOffset);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateOffset);
    };
  }, []);

  const items = virtualizer.getVirtualItems();
  const top = items.length ? Math.max(0, items[0].start - scrollMargin) : 0;
  const bottom = items.length
    ? Math.max(
        0,
        virtualizer.getTotalSize() -
          (items[items.length - 1].end - scrollMargin),
      )
    : virtualizer.getTotalSize();

  return (
    <TableBody ref={bodyRef}>
      {top > 0 ? (
        <tr aria-hidden="true">
          <td
            colSpan={rows[0]?.getVisibleCells().length ?? 7}
            style={{ height: top, padding: 0, border: 0 }}
          />
        </tr>
      ) : null}
      {items.map((item) => {
        const row = rows[item.index];
        return (
          <TableRow
            key={row.id}
            data-state={row.getIsSelected() ? "selected" : undefined}
            data-index={item.index}
            ref={virtualizer.measureElement}
            aria-rowindex={rowOffset + item.index + 2}
            className="h-[76px] border-border-lighter hover:bg-surface-subtle/60"
          >
            <AuditRowCells row={row} />
          </TableRow>
        );
      })}
      {bottom > 0 ? (
        <tr aria-hidden="true">
          <td
            colSpan={rows[0]?.getVisibleCells().length ?? 7}
            style={{ height: bottom, padding: 0, border: 0 }}
          />
        </tr>
      ) : null}
    </TableBody>
  );
}

export const AuditTableRows = memo(function AuditTableRows({
  rows,
  rowOffset = 0,
}: {
  rows: AuditRow[];
  rowOffset?: number;
}) {
  if (rows.length > 100)
    return <VirtualAuditTableRows rows={rows} rowOffset={rowOffset} />;
  return (
    <TableBody>
      {rows.map((row, index) => (
        <TableRow
          key={row.id}
          data-state={row.getIsSelected() ? "selected" : undefined}
          aria-rowindex={rowOffset + index + 2}
          className="h-[76px] border-border-lighter hover:bg-surface-subtle/60"
        >
          <AuditRowCells row={row} />
        </TableRow>
      ))}
    </TableBody>
  );
});
