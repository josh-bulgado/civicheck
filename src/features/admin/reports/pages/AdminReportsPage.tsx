import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Clock3,
  FileWarning,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { AdminReportsData } from "~/features/admin/reports/reports.types";

const generatedAtFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

export function AdminReportsPage({ data }: { data: AdminReportsData }) {
  const maxMonthlyVolume = Math.max(
    ...data.requestVolume.months.map((month) => month.count),
    1,
  );

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex min-w-0 flex-col gap-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
              <BarChart3 className="size-4" aria-hidden="true" />
              CCRO Administration · Insights
            </p>
            <div className="flex flex-col gap-2">
              <h1 className="text-balance text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
                Operational Reports
              </h1>
              <p className="max-w-2xl text-pretty text-sm leading-6 text-white/80">
                Track service demand, release turnaround, and submissions that
                needed follow-up using live office data.
              </p>
            </div>
          </div>
          <div className="flex min-w-64 items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-sm">
            <CalendarRange className="size-5 text-brand-gold" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-white/70">Reporting period</p>
              <p className="mt-1 text-sm font-bold">{data.period.label}</p>
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="report-summary-heading" className="grid gap-4 lg:grid-cols-2">
        <h2 id="report-summary-heading" className="sr-only">
          Report summary
        </h2>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <h2>Request Volume</h2>
            </CardTitle>
            <CardDescription>
              Requests submitted in each of the last six calendar months. The
              current month is shown through today.
            </CardDescription>
            <CardAction>
              <Badge variant="secondary">
                {data.requestVolume.total.toLocaleString()} submitted
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            {data.requestVolume.total > 0 ? (
              <ol className="flex flex-col gap-4" aria-label="Monthly request volume">
                {data.requestVolume.months.map((month) => (
                  <li
                    className="grid grid-cols-[5.5rem_minmax(0,1fr)_3rem] items-center gap-3"
                    key={month.key}
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {month.label}
                    </span>
                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${(month.count / maxMonthlyVolume) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-right text-sm font-bold tabular-nums">
                      {month.count.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <Alert>
                <CheckCircle2 aria-hidden="true" />
                <AlertTitle>No Requests in This Period</AlertTitle>
                <AlertDescription>
                  Monthly request volume will appear after the first submission.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Processing Time</h2>
            </CardTitle>
            <CardDescription>
              Average calendar days from submission to the first recorded release
              event during this reporting period.
            </CardDescription>
            <CardAction>
              <Clock3 className="size-5 text-primary" aria-hidden="true" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-5">
            {data.processingTime.averageDays !== null ? (
              <div>
                <p className="text-4xl font-extrabold tracking-tight tabular-nums">
                  {data.processingTime.averageDays.toLocaleString()}
                  <span className="ml-2 text-base font-medium text-muted-foreground">
                    days
                  </span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Based on {data.processingTime.releasedCount.toLocaleString()} recorded
                  release{data.processingTime.releasedCount === 1 ? "" : "s"}.
                </p>
              </div>
            ) : (
              <Alert>
                <Clock3 aria-hidden="true" />
                <AlertTitle>No Recorded Releases Yet</AlertTitle>
                <AlertDescription>
                  Processing time will appear after a request reaches release.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Incomplete Submissions</h2>
            </CardTitle>
            <CardDescription>
              Submitted requests that were marked incomplete at least once during
              this reporting period.
            </CardDescription>
            <CardAction>
              <FileWarning className="size-5 text-primary" aria-hidden="true" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-5">
            {data.incompleteSubmissions.percentage !== null ? (
              <div>
                <p className="text-4xl font-extrabold tracking-tight tabular-nums">
                  {data.incompleteSubmissions.percentage.toLocaleString()}%
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {data.incompleteSubmissions.count.toLocaleString()} of{" "}
                  {data.incompleteSubmissions.submittedCount.toLocaleString()} submissions
                  needed a completeness follow-up.
                </p>
              </div>
            ) : (
              <Alert>
                <FileWarning aria-hidden="true" />
                <AlertTitle>No Submission History Yet</AlertTitle>
                <AlertDescription>
                  The incomplete-submission rate will appear after requests are submitted.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">
        Generated from live request and workflow activity at{" "}
        <time dateTime={data.generatedAt}>
          {generatedAtFormatter.format(new Date(data.generatedAt))}
        </time>
        .
      </p>
    </div>
  );
}
