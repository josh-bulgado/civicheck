import { Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { BarList } from "~/features/admin/reports/components/BarList";
import { SeasonalityChart } from "~/features/admin/reports/components/EventSeasonalityCard";
import {
  ProportionBar,
  type ProportionSegment,
} from "~/features/admin/reports/components/ProportionBar";
import { ReportPanel } from "~/features/admin/reports/components/ReportPanel";
import { ShowNumbers } from "~/features/admin/reports/components/ShowNumbers";
import {
  THIN_RELEASE_SAMPLE,
  describeBusySeason,
  formatCount,
  formatDays,
  pluralize,
  summarizeOffice,
  type OfficeSummary,
} from "~/features/admin/reports/report-summary";
import {
  busiestBucket,
  volumeRows,
  type VolumeBucket,
} from "~/features/admin/reports/report-volume";
import type {
  RequestVolumeData,
  ServiceReportData,
} from "~/features/admin/reports/reports.types";
import {
  periodPhrase,
  type ReportPeriodMonths,
} from "~/features/admin/reports/service-report";
import type { ServiceReportRow } from "~/features/admin/reports/service-report.queries";
import { cn } from "~/lib/utils";

/** How many services the "most asked for" question names. The Services tab has the rest. */
const TOP_SERVICES = 5;

// Whole class names, never built from parts, so Tailwind can find them.
const OUTCOME_TONES = {
  released: { bar: "bg-health-success-dot", border: "border-health-success-dot" },
  open: { bar: "bg-health-info-dot", border: "border-health-info-dot" },
  rejected: { bar: "bg-health-error-dot", border: "border-health-error-dot" },
  sentBack: { bar: "bg-health-warning-dot", border: "border-health-warning-dot" },
  neutral: { bar: "bg-muted-2", border: "border-muted-2" },
} as const;

const strong = "font-extrabold text-foreground";

function describeTurnaround(avgDays: number | null): string {
  if (avgDays === null) return "";
  return avgDays === 0 ? ", all on the same day" : `, taking ${formatDays(avgDays)} on average`;
}

// ─── The short version ───────────────────────────────────────────────────────

function OfficeSummaryPanel({
  summary,
  months,
  periodLabel,
}: {
  summary: OfficeSummary;
  months: ReportPeriodMonths;
  periodLabel: string;
}) {
  const outcomes: ProportionSegment[] = [
    { key: "released", label: "Released", count: summary.released, tone: OUTCOME_TONES.released },
    { key: "open", label: "Still open", count: summary.open, tone: OUTCOME_TONES.open },
    { key: "rejected", label: "Rejected", count: summary.rejected, tone: OUTCOME_TONES.rejected },
  ];

  return (
    <ReportPanel
      title={<span className="sr-only">The short version</span>}
      className="border-transparent bg-primary-soft"
    >
      <p className="max-w-3xl text-pretty text-2xl leading-snug text-foreground">
        In {periodPhrase(months)} ({periodLabel}),{" "}
        <strong className={strong}>
          {formatCount(summary.requests)} {pluralize(summary.requests, "request")}
        </strong>{" "}
        came in.{" "}
        {summary.released > 0 ? (
          <>
            <strong className={strong}>{formatCount(summary.released)}</strong>{" "}
            {pluralize(summary.released, "was", "were")} released
            {describeTurnaround(summary.avgDays)}.{" "}
          </>
        ) : null}
        <strong className={strong}>{formatCount(summary.open)}</strong>{" "}
        {pluralize(summary.open, "is", "are")} still open.{" "}
        {summary.sentBack > 0 ? (
          <>
            <strong className={strong}>{formatCount(summary.sentBack)}</strong>{" "}
            {pluralize(summary.sentBack, "was", "were")} sent back because papers were
            missing.
          </>
        ) : (
          "None had to be sent back for missing papers."
        )}
      </p>
      <ProportionBar segments={outcomes} />
    </ReportPanel>
  );
}

// ─── The five questions ──────────────────────────────────────────────────────

function BusyQuestion({ buckets }: { buckets: ReadonlyArray<VolumeBucket> }) {
  const rows = volumeRows(buckets);
  const busiest = busiestBucket(buckets);
  const current = buckets.find((bucket) => bucket.current);
  const unit = busiest?.key.includes("Q") ? "quarter" : "month";
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <ReportPanel title="How Busy Has the Office Been?">
      <p className="max-w-prose text-lg font-semibold text-foreground">
        {busiest
          ? `${busiest.label} was the busiest ${unit}, with ${formatCount(busiest.count)} ${pluralize(busiest.count, "request")}.`
          : "No requests came in during this period."}
        {current && current.count > 0 && current.key !== busiest?.key
          ? ` ${current.label} has ${formatCount(current.count)} so far.`
          : ""}
      </p>
      <BarList
        label={`Requests per ${unit}`}
        rows={rows.map((row) => ({
          key: row.key,
          label: (
            <>
              {row.label}
              {row.current && !row.gap ? " (so far)" : ""}
              {row.busiest ? (
                <Badge variant="info" className="ml-2 align-middle">
                  Busiest
                </Badge>
              ) : null}
            </>
          ),
          value: row.count,
          gap: row.gap,
        }))}
      />
      <ShowNumbers
        label={`Requests per ${unit}`}
        columns={[{ header: unit === "month" ? "Month" : "Quarter" }, { header: "Requests", numeric: true }]}
        rows={rows.filter((row) => !row.gap).map((row) => [row.label, row.count])}
        footer={["Total", total]}
      />
    </ReportPanel>
  );
}

function TurnaroundQuestion({
  summary,
  services,
}: {
  summary: OfficeSummary;
  services: ReadonlyArray<ServiceReportRow>;
}) {
  const released = services
    .filter((row) => row.releaseSample > 0 && row.avgReleaseDays !== null)
    .sort((a, b) => b.releaseSample - a.releaseSample);

  return (
    <ReportPanel title="How Long Does a Request Take?">
      {summary.avgDays === null ? (
        <Alert className="civic-enter-sm">
          <ClipboardList aria-hidden="true" />
          <AlertTitle>No Releases Yet</AlertTitle>
          <AlertDescription>
            The average appears after the first request is released.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-5xl font-extrabold leading-none tracking-tight tabular-nums">
              {Number.isInteger(summary.avgDays) ? summary.avgDays : summary.avgDays.toFixed(1)}
            </span>
            <span className="text-lg font-semibold text-muted-foreground">
              {summary.avgDays === 1 ? "day" : "days"} on average, from submission to release
            </span>
          </p>
          <p className="max-w-prose text-base text-muted-foreground">
            Based on {formatCount(summary.releaseSample)} released{" "}
            {pluralize(summary.releaseSample, "request")}.
            {summary.dominantRelease
              ? ` ${summary.dominantRelease.label} accounts for ${formatCount(summary.dominantRelease.count)} of them, so the average mostly reflects that one service.`
              : ""}
          </p>
          <BarList
            label="Average days to release, by service"
            rows={released.map((row) => ({
              key: row.key,
              label: row.label,
              value: row.avgReleaseDays ?? 0,
              valueLabel: formatDays(row.avgReleaseDays),
              note: `from ${formatCount(row.releaseSample)} released ${pluralize(row.releaseSample, "request")}${
                row.releaseSample < THIN_RELEASE_SAMPLE ? " · too few to compare" : ""
              }`,
            }))}
          />
          <ShowNumbers
            label="Average days to release, by service"
            columns={[
              { header: "Service" },
              { header: "Average days", numeric: true },
              { header: "Released", numeric: true },
            ]}
            rows={released.map((row) => [
              row.label,
              formatDays(row.avgReleaseDays),
              row.releaseSample,
            ])}
          />
        </>
      )}
    </ReportPanel>
  );
}

function SentBackQuestion({
  summary,
  services,
}: {
  summary: OfficeSummary;
  services: ReadonlyArray<ServiceReportRow>;
}) {
  const sentBack = services
    .filter((row) => row.incomplete > 0)
    .sort((a, b) => b.incomplete - a.incomplete);

  return (
    <ReportPanel title="How Many Requests Were Sent Back for Missing Papers?">
      <p className="max-w-prose text-lg font-semibold text-foreground">
        {summary.sentBack === 0
          ? "None. No request was marked incomplete in this period."
          : `${formatCount(summary.sentBack)} of ${formatCount(summary.requests)} (${summary.sentBackPercent}%).`}
      </p>
      {summary.sentBack > 0 ? (
        <>
          <ProportionBar
            segments={[
              {
                key: "sent-back",
                label: "Sent back",
                count: summary.sentBack,
                tone: OUTCOME_TONES.sentBack,
              },
              {
                key: "not-sent-back",
                label: "Not sent back",
                count: summary.requests - summary.sentBack,
                tone: OUTCOME_TONES.neutral,
              },
            ]}
          />
          <BarList
            label="Requests sent back, by service"
            max={Math.max(...sentBack.map((row) => row.total))}
            rows={sentBack.map((row) => ({
              key: row.key,
              label: row.label,
              value: row.incomplete,
              valueLabel: `${formatCount(row.incomplete)} of ${formatCount(row.total)}`,
            }))}
          />
          <ShowNumbers
            label="Requests sent back, by service"
            columns={[
              { header: "Service" },
              { header: "Sent back", numeric: true },
              { header: "Requests", numeric: true },
            ]}
            rows={sentBack.map((row) => [row.label, row.incomplete, row.total])}
          />
        </>
      ) : null}
      <div>
        <Link
          to="/requests"
          search={{ status: "incomplete" }}
          className={cn(buttonVariants({ variant: "link", size: "lg" }), "h-auto px-0 text-base")}
        >
          See Requests Marked Incomplete
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Link>
      </div>
    </ReportPanel>
  );
}

function TopServicesQuestion({
  summary,
  services,
  onViewServices,
}: {
  summary: OfficeSummary;
  services: ReadonlyArray<ServiceReportRow>;
  onViewServices: () => void;
}) {
  const ranked = [...services].sort((a, b) => b.total - a.total);
  const top = ranked.slice(0, TOP_SERVICES);
  const rest = ranked.length - top.length;

  return (
    <ReportPanel title="Which Services Do People Ask for Most?">
      {summary.topService ? (
        <p className="max-w-prose text-lg font-semibold text-foreground">
          {summary.topService.label} is {summary.topService.percent}% of all requests.
        </p>
      ) : null}
      <BarList
        label="Requests by service"
        rows={top.map((row) => ({
          key: row.key,
          label: row.label,
          value: row.total,
          valueLabel: formatCount(row.total),
          note: `${((row.total / summary.requests) * 100).toFixed(1)}% of all requests`,
        }))}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <ShowNumbers
          label="Requests by service"
          trigger={`Show All ${ranked.length} Services`}
          columns={[
            { header: "Service" },
            { header: "Requests", numeric: true },
            { header: "Still open", numeric: true },
          ]}
          rows={ranked.map((row) => [row.label, row.total, row.pending])}
          footer={["Total", summary.requests, summary.open]}
        />
        {rest > 0 ? (
          <Button variant="link" size="lg" className="h-auto px-0 text-base" onClick={onViewServices}>
            See {rest} More {pluralize(rest, "Service")}
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Button>
        ) : null}
      </div>
    </ReportPanel>
  );
}

function PlanQuestion({ report }: { report: ServiceReportData }) {
  const { insight, selectedService: service } = report;
  if (!service) return null;

  return (
    <ReportPanel title="What Should the Office Plan For?">
      <p className="max-w-prose text-lg font-semibold text-foreground">
        {describeBusySeason(report) ??
          `There are not enough dated requests for ${service.label} to show a busy season yet.`}
      </p>
      <SeasonalityChart insight={insight} />
    </ReportPanel>
  );
}

// ─── The tab ─────────────────────────────────────────────────────────────────

interface BriefingTabProps {
  volume: RequestVolumeData;
  report: ServiceReportData;
  months: ReportPeriodMonths;
  onViewServices: () => void;
}

/**
 * The report as a briefing: one paragraph that answers "how are we doing", then
 * five plain questions, each with a sentence for an answer, a picture, and its
 * table one press away. It is written to be read, not operated.
 */
export function BriefingTab({ volume, report, months, onViewServices }: BriefingTabProps) {
  const summary = summarizeOffice(report);

  if (summary.requests === 0) {
    return (
      <Alert className="civic-enter-sm">
        <ClipboardList aria-hidden="true" />
        <AlertTitle>No Requests in This Period</AlertTitle>
        <AlertDescription>
          The briefing appears after the first request. Try a longer reporting period.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <OfficeSummaryPanel
        summary={summary}
        months={months}
        periodLabel={report.period.label}
      />
      <BusyQuestion buckets={volume.buckets} />
      {/* Side by side from a laptop up, so the whole briefing fits in fewer screens. */}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <TurnaroundQuestion summary={summary} services={report.services} />
        <SentBackQuestion summary={summary} services={report.services} />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <TopServicesQuestion
          summary={summary}
          services={report.services}
          onViewServices={onViewServices}
        />
        <PlanQuestion report={report} />
      </div>
    </div>
  );
}
