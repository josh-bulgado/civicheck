import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Clock3,
  FileWarning,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
import { CountUp } from "~/components/motion/count-up";
import { enterDelay, staggerStyle } from "~/components/motion/stagger";
import type { AdminReportsData } from "~/features/admin/reports/reports.types";
import type { ServiceReportData } from "~/features/admin/reports/service-report.queries";
import { EventSeasonalityCard } from "~/features/admin/reports/components/EventSeasonalityCard";
import { RegistrationLagCard } from "~/features/admin/reports/components/RegistrationLagCard";
import { ReportFilters } from "~/features/admin/reports/components/ReportFilters";
import { ServicePerformanceTable } from "~/features/admin/reports/components/ServicePerformanceTable";
import { ServiceProfileCards } from "~/features/admin/reports/components/ServiceProfileCards";
import { UpcomingEventsCard } from "~/features/admin/reports/components/UpcomingEventsCard";

const generatedAtFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

interface AdminReportsPageProps {
  data: AdminReportsData;
  serviceReport: ServiceReportData;
  onFilterChange: (next: { months?: number; service?: string }) => void;
}

export function AdminReportsPage({
  data,
  serviceReport,
  onFilterChange,
}: AdminReportsPageProps) {
  const selected = serviceReport.selectedService;
  const showUpcoming = selected?.eventDateDirection === "future";

  const maxMonthlyVolume = Math.max(
    ...data.requestVolume.months.map((month) => month.count),
    1,
  );

  // Bars render at 0 and grow to their real width once mounted, so the chart
  // reads as filling in rather than appearing pre-drawn.
  const [barsGrown, setBarsGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setBarsGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

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
          <div
            className="civic-enter-scale flex min-w-64 items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-sm"
            style={enterDelay(160)}
          >
            <CalendarRange className="size-5 text-brand-gold" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-white/70">Reporting period</p>
              <p className="mt-1 text-sm font-bold">{serviceReport.period.label}</p>
            </div>
          </div>
        </div>
      </header>

      <ReportFilters
        months={serviceReport.period.months}
        service={selected?.key ?? null}
        services={serviceReport.services}
        onChange={onFilterChange}
      />

      <Tabs defaultValue="office">
        <TabsList aria-label="Report views">
          <TabsTrigger value="office">Office Overview</TabsTrigger>
          <TabsTrigger value="services">Service Performance</TabsTrigger>
          <TabsTrigger value="insight">Service Insight</TabsTrigger>
        </TabsList>

        <TabsContent value="office" className="mt-4">
          <section
            aria-labelledby="report-summary-heading"
            className="civic-stagger grid gap-4 lg:grid-cols-2"
          >
            <h2 id="report-summary-heading" className="sr-only">
              Report summary
            </h2>

            <Card style={staggerStyle(0)} className="lg:col-span-2">
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
                    <CountUp value={data.requestVolume.total} /> submitted
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                {data.requestVolume.total > 0 ? (
                  <ol
                    className="civic-stagger flex flex-col gap-4"
                    aria-label="Monthly request volume"
                  >
                    {data.requestVolume.months.map((month, index) => (
                      <li
                        className="grid grid-cols-[5.5rem_minmax(0,1fr)_3rem] items-center gap-3"
                        key={month.key}
                        style={staggerStyle(index)}
                      >
                        <span className="text-xs font-medium text-muted-foreground">
                          {month.label}
                        </span>
                        <div className="h-3 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                            style={{
                              width: barsGrown
                                ? `${(month.count / maxMonthlyVolume) * 100}%`
                                : "0%",
                              transitionDelay: `${index * 55}ms`,
                            }}
                          />
                        </div>
                        <span className="text-right text-sm font-bold tabular-nums">
                          <CountUp value={month.count} duration={700} />
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Alert className="civic-enter-sm">
                    <CheckCircle2 aria-hidden="true" />
                    <AlertTitle>No Requests in This Period</AlertTitle>
                    <AlertDescription>
                      Monthly request volume will appear after the first submission.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card style={staggerStyle(1)}>
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
                  <div className="civic-enter-sm">
                    <p className="text-4xl font-extrabold tracking-tight tabular-nums">
                      <CountUp
                        value={data.processingTime.averageDays}
                        decimals={
                          Number.isInteger(data.processingTime.averageDays) ? 0 : 1
                        }
                      />
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
                  <Alert className="civic-enter-sm">
                    <Clock3 aria-hidden="true" />
                    <AlertTitle>No Recorded Releases Yet</AlertTitle>
                    <AlertDescription>
                      Processing time will appear after a request reaches release.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card style={staggerStyle(2)}>
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
                  <div className="civic-enter-sm">
                    <p className="text-4xl font-extrabold tracking-tight tabular-nums">
                      <CountUp
                        value={data.incompleteSubmissions.percentage}
                        decimals={
                          Number.isInteger(data.incompleteSubmissions.percentage) ? 0 : 1
                        }
                        suffix="%"
                      />
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {data.incompleteSubmissions.count.toLocaleString()} of{" "}
                      {data.incompleteSubmissions.submittedCount.toLocaleString()} submissions
                      needed a completeness follow-up.
                    </p>
                  </div>
                ) : (
                  <Alert className="civic-enter-sm">
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
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <ServicePerformanceTable
            services={serviceReport.services}
            totalRequests={serviceReport.totals.requests}
          />
        </TabsContent>

        <TabsContent value="insight" className="mt-4">
          {selected ? (
            <section
              aria-label={`Insight for ${selected.label}`}
              className="civic-stagger grid gap-4 lg:grid-cols-2"
            >
              <EventSeasonalityCard
                insight={serviceReport.insight}
                service={selected}
              />
              {showUpcoming ? (
                <UpcomingEventsCard
                  insight={serviceReport.insight}
                  eventLabel={selected.eventDateLabel ?? "events"}
                />
              ) : (
                <RegistrationLagCard
                  insight={serviceReport.insight}
                  service={selected}
                />
              )}
              <ServiceProfileCards
                insight={serviceReport.insight}
                service={selected}
              />
            </section>
          ) : (
            <Alert className="civic-enter-sm">
              <CheckCircle2 aria-hidden="true" />
              <AlertTitle>No Service to Profile</AlertTitle>
              <AlertDescription>
                No requests were submitted in this period, so there is nothing to
                break down yet. Try widening the reporting period.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

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
