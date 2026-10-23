import type { Ref } from "react";
import {
  formatCount,
  formatDays,
  pluralize,
  type OfficeSummary,
} from "~/features/admin/reports/report-summary";
import {
  volumeRows,
  type VolumeBucket,
} from "~/features/admin/reports/report-volume";
import type { ServiceReportRow } from "~/features/admin/reports/service-report.queries";

export const SHEET_SECTIONS = [
  { key: "summary", label: "Summary" },
  { key: "volume", label: "Requests per month" },
  { key: "services", label: "By service" },
  { key: "seasons", label: "Busy seasons" },
  { key: "signatures", label: "Signature lines" },
] as const;

export type SheetSectionKey = (typeof SHEET_SECTIONS)[number]["key"];
export type SheetSections = Record<SheetSectionKey, boolean>;

interface ReportSheetProps {
  /** The printable page itself, so the Print button can hand it to the printer. */
  ref?: Ref<HTMLElement>;
  sections: SheetSections;
  summary: OfficeSummary;
  buckets: ReadonlyArray<VolumeBucket>;
  services: ReadonlyArray<ServiceReportRow>;
  /** Names the period at the top of the sheet: "Nov 1, 2025 – Oct 23, 2026". */
  periodLabel: string;
  /** The busy-season sentence, or null when there is not enough to say. */
  busySeason: string | null;
  generatedLabel: string;
}

const NUMERALS = ["I", "II", "III", "IV", "V", "VI"] as const;

// The sheet is paper: black ink on white in either theme, with borders and
// hatching rather than colour so it survives a black-and-white printer.
const CELL = "border border-black px-2 py-1.5 align-top";
const HEAD = `${CELL} bg-neutral-200 text-left font-bold`;
const NUM = "text-right tabular-nums";
const HATCH = "repeating-linear-gradient(45deg, #000 0 2px, transparent 2px 5px)";

/**
 * The office report as a page to print or save as a PDF: letterhead, numbered
 * sections, signature lines. Printing shows only this element (see the print
 * rules in app.css).
 */
export function ReportSheet({
  ref,
  sections,
  summary,
  buckets,
  services,
  periodLabel,
  busySeason,
  generatedLabel,
}: ReportSheetProps) {
  const rows = volumeRows(buckets);
  const peak = Math.max(1, ...rows.map((row) => row.count));
  const ranked = [...services].sort((a, b) => b.total - a.total);
  const quarterly = buckets[0]?.key.includes("Q") ?? false;

  // Numbered in the order they appear, so switching a section off leaves no gap.
  const numeral = (() => {
    let next = 0;
    return () => NUMERALS[next++];
  })();

  return (
    <article
      ref={ref}
      aria-label="Operational report"
      className="report-sheet mx-auto flex w-full max-w-3xl flex-col gap-6 bg-white p-6 text-base text-black shadow-lg ring-1 ring-black/15 sm:p-10"
    >
      <header className="border-b-4 border-double border-black pb-3 text-center">
        <p className="text-sm text-neutral-700">Republic of the Philippines</p>
        <p className="text-sm text-neutral-700">City Government of Legazpi</p>
        <p className="mt-1 text-xl font-bold tracking-wide">CITY CIVIL REGISTRAR OFFICE</p>
      </header>

      <div className="text-center">
        <h2 className="text-2xl font-extrabold">Operational Report</h2>
        <p className="text-neutral-700">Period covered: {periodLabel}</p>
      </div>

      {sections.summary ? (
        <section>
          <h3 className="mb-1.5 text-lg font-bold">{numeral()}. Summary</h3>
          <p>
            The office received <b>{formatCount(summary.requests)}</b>{" "}
            {pluralize(summary.requests, "request")}.{" "}
            <b>{formatCount(summary.released)}</b> {pluralize(summary.released, "was", "were")}{" "}
            released
            {summary.avgDays === null
              ? ""
              : `, taking ${formatDays(summary.avgDays)} on average from submission`}
            . <b>{formatCount(summary.open)}</b> remain open and{" "}
            <b>{formatCount(summary.rejected)}</b> {pluralize(summary.rejected, "was", "were")}{" "}
            rejected. <b>{formatCount(summary.sentBack)}</b>{" "}
            {pluralize(summary.sentBack, "request was", "requests were")} sent back for
            missing documents
            {summary.sentBackPercent === null ? "" : ` (${summary.sentBackPercent}%)`}.
          </p>
        </section>
      ) : null}

      {sections.volume ? (
        <section>
          <h3 className="mb-1.5 text-lg font-bold">
            {numeral()}. Requests received per {quarterly ? "quarter" : "month"}
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={HEAD}>
                  Period
                </th>
                <th scope="col" className={`${HEAD} ${NUM}`}>
                  Requests
                </th>
                <th scope="col" className={HEAD}>
                  <span className="sr-only">Bar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className={`${CELL} text-left font-normal`}>
                    {row.label}
                  </th>
                  <td className={`${CELL} ${NUM}`}>{formatCount(row.count)}</td>
                  <td className={`${CELL} w-2/5`}>
                    {row.count > 0 ? (
                      <span
                        aria-hidden="true"
                        className="block h-3 min-w-0.5 border border-black"
                        style={{
                          width: `${(row.count / peak) * 100}%`,
                          backgroundImage: HATCH,
                        }}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className={`${CELL} text-left`}>
                  Total
                </th>
                <td className={`${CELL} ${NUM} font-bold`}>{formatCount(summary.requests)}</td>
                <td className={CELL} />
              </tr>
            </tfoot>
          </table>
        </section>
      ) : null}

      {sections.services ? (
        <section>
          <h3 className="mb-1.5 text-lg font-bold">{numeral()}. Requests by service</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={HEAD}>
                    Service
                  </th>
                  {["Requests", "Released", "Avg. days", "Sent back", "Open"].map((head) => (
                    <th key={head} scope="col" className={`${HEAD} ${NUM}`}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranked.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className={`${CELL} text-left font-normal`}>
                      {row.label}
                    </th>
                    <td className={`${CELL} ${NUM}`}>{formatCount(row.total)}</td>
                    <td className={`${CELL} ${NUM}`}>{formatCount(row.released)}</td>
                    <td className={`${CELL} ${NUM}`}>
                      {row.avgReleaseDays === null ? "—" : row.avgReleaseDays}
                    </td>
                    <td className={`${CELL} ${NUM}`}>{formatCount(row.incomplete)}</td>
                    <td className={`${CELL} ${NUM}`}>{formatCount(row.pending)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <th scope="row" className={`${CELL} text-left`}>
                    Total
                  </th>
                  <td className={`${CELL} ${NUM}`}>{formatCount(summary.requests)}</td>
                  <td className={`${CELL} ${NUM}`}>{formatCount(summary.released)}</td>
                  <td className={`${CELL} ${NUM}`}>
                    {summary.avgDays === null ? "—" : summary.avgDays}
                  </td>
                  <td className={`${CELL} ${NUM}`}>{formatCount(summary.sentBack)}</td>
                  <td className={`${CELL} ${NUM}`}>{formatCount(summary.open)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-1.5 text-sm text-neutral-700">
            Average days counts only released requests. A service with one or two
            releases is too few to compare.
          </p>
        </section>
      ) : null}

      {sections.seasons ? (
        <section>
          <h3 className="mb-1.5 text-lg font-bold">{numeral()}. Busy seasons</h3>
          <p>
            {busySeason ??
              "There are not enough dated requests yet to name a busy season."}{" "}
            This is a sample of requests filed through CiviCheck, not a complete record of
            Legazpi.
          </p>
        </section>
      ) : null}

      <section>
        <h3 className="mb-1.5 text-lg font-bold">{numeral()}. Remarks</h3>
        <div className="flex flex-col gap-6 pt-3" aria-hidden="true">
          <span className="block border-b border-neutral-400" />
          <span className="block border-b border-neutral-400" />
          <span className="block border-b border-neutral-400" />
        </div>
      </section>

      {sections.signatures ? (
        <div className="mt-4 grid grid-cols-2 gap-10 text-center text-sm">
          <p className="border-t border-black pt-1">
            Prepared by
            <br />
            CCRO Staff
          </p>
          <p className="border-t border-black pt-1">
            Noted by
            <br />
            City Civil Registrar
          </p>
        </div>
      ) : null}

      <footer className="border-t border-neutral-400 pt-2 text-sm text-neutral-700">
        Generated by CiviCheck from live office data on {generatedLabel}
      </footer>
    </article>
  );
}
