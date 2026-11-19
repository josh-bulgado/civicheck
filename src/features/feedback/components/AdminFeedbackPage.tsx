import { memo, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTable } from "@tanstack/react-table";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { QuietLink } from "~/components/quiet-link";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DataTableCard } from "~/components/ui/data-table-card";
import { DatePicker } from "~/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PageHeaderCard } from "~/components/ui/page-header-card";
import { Progress, ProgressLabel } from "~/components/ui/progress";
import { Spinner } from "~/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { appTableFeatures, type AppColumnDef } from "~/lib/table";
import {
  EASE_LABELS,
  FEEDBACK_STATUSES,
  FEEDBACK_TOPICS,
  PROBLEM_CATEGORIES,
  PROBLEM_STATUSES,
  SATISFACTION_LABELS,
  reviewSubmissionSchema,
  satisfactionPercent,
  type ReviewFilters,
  type ReviewItem,
} from "../feedback";
import {
  updateSubmissionReviewFn,
  type AdminFeedbackData,
} from "../feedback.functions";

const dateFormat = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: "Asia/Manila",
});
const STATUS_LABELS = { ...FEEDBACK_STATUSES, ...PROBLEM_STATUSES };
const FEEDBACK_STATUS_OPTIONS = Object.entries(FEEDBACK_STATUSES).map(
  ([value, label]) => ({ value, label }),
);
const PROBLEM_STATUS_OPTIONS = Object.entries(PROBLEM_STATUSES).map(
  ([value, label]) => ({ value, label }),
);
const CLEARED_FILTERS = {
  service: "",
  from: "",
  until: "",
  page: 1,
} satisfies Partial<ReviewFilters>;

function hasReviewFilters(filters: ReviewFilters) {
  return Boolean(filters.service || filters.from || filters.until);
}

function ReviewBadge({ status }: { status: ReviewItem["status"] }) {
  return (
    <Badge
      variant={
        status === "needs_action"
          ? "warning"
          : status === "resolved" || status === "reviewed"
            ? "success"
            : "neutral"
      }
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const Filters = memo(function Filters({
  filters,
  services,
  onChange,
}: {
  filters: ReviewFilters;
  services: AdminFeedbackData["services"];
  onChange: (value: Partial<ReviewFilters>) => void;
}) {
  const [service, setService] = useState(filters.service);
  const [from, setFrom] = useState(filters.from);
  const [until, setUntil] = useState(filters.until);
  const serviceOptions = useMemo(
    () => [
      { value: "", label: "All services" },
      ...services.map((item) => ({ value: item.code, label: item.name })),
    ],
    [services],
  );
  function apply(event: FormEvent) {
    event.preventDefault();
    onChange({ service, from, until, page: 1 });
  }
  return (
    <form
      onSubmit={apply}
      className="w-full"
      aria-label="Filter feedback and reports"
    >
      <FieldGroup className="grid! gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(11rem,1fr)_11rem_11rem_auto]">
        <Field className="min-w-0 sm:col-span-2 lg:col-span-1">
          <FieldLabel htmlFor="review-service">Service</FieldLabel>
          <Select
            value={service}
            onValueChange={(value) => setService(value ?? "")}
            items={serviceOptions}
          >
            <SelectTrigger id="review-service" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {serviceOptions.map((option) => (
                  <SelectItem value={option.value} key={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field className="min-w-0">
          <FieldLabel htmlFor="review-from">From</FieldLabel>
          <DatePicker
            id="review-from"
            value={from}
            onValueChange={setFrom}
            max={until || undefined}
            trigger="input"
            placeholder="MM/DD/YYYY"
            shape="split"
          />
        </Field>
        <Field className="min-w-0">
          <FieldLabel htmlFor="review-until">Through</FieldLabel>
          <DatePicker
            id="review-until"
            value={until}
            onValueChange={setUntil}
            min={from || undefined}
            trigger="input"
            placeholder="MM/DD/YYYY"
            shape="split"
          />
        </Field>
        <div className="flex flex-wrap items-start gap-2 sm:col-span-2 lg:col-span-1 lg:pt-8">
          <Button type="submit" variant="outline">
            Apply filters
          </Button>
          {hasReviewFilters(filters) ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange(CLEARED_FILTERS)}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
});

function ReviewDialog({
  item,
  onClose,
  onUpdated,
}: {
  item: ReviewItem;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [status, setStatus] = useState(item.status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateReview = useServerFn(updateSubmissionReviewFn);
  const statusOptions =
    item.kind === "feedback"
      ? FEEDBACK_STATUS_OPTIONS
      : PROBLEM_STATUS_OPTIONS;
  async function save() {
    if (pending) return;
    const input = reviewSubmissionSchema.safeParse({
      kind: item.kind,
      id: item.id,
      status,
    });
    if (!input.success) {
      setError("Choose a valid review status.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await updateReview({ data: input.data });
      if (result.error) {
        setError(result.message);
        return;
      }
      toast.success("Review status saved.");
      onUpdated();
      onClose();
    } catch {
      setError(
        "The review could not be saved. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value && !pending) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!pending}
      >
        <DialogHeader>
          <DialogTitle>
            {item.kind === "feedback"
              ? "Review feedback"
              : "Review problem report"}
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono wrap-anywhere">{item.reference}</span> ·{" "}
            {dateFormat.format(new Date(item.createdAt))}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <dl className="grid gap-x-4 gap-y-2 rounded-lg border border-border p-4 text-sm sm:grid-cols-[7rem_minmax(0,1fr)] [&>dt:not(:first-child)]:mt-2 sm:[&>dt:not(:first-child)]:mt-0">
            <dt className="text-muted-foreground">Service</dt>
            <dd className="font-medium wrap-anywhere">{item.serviceName}</dd>
            {item.rating !== null && (
              <>
                <dt className="text-muted-foreground">Satisfaction</dt>
                <dd className="flex items-center gap-2">
                  <Star
                    className="size-5 text-primary"
                    fill="currentColor"
                    aria-hidden="true"
                  />
                  {item.rating}/5 · {SATISFACTION_LABELS[item.rating - 1]}
                </dd>
              </>
            )}
            {item.easeRating !== null && (
              <>
                <dt className="text-muted-foreground">Ease of use</dt>
                <dd>{EASE_LABELS[item.easeRating - 1]}</dd>
              </>
            )}
            {item.topics.length > 0 && (
              <>
                <dt className="text-muted-foreground">Topics</dt>
                <dd className="wrap-anywhere">
                  {item.topics
                    .map(
                      (topic) =>
                        FEEDBACK_TOPICS[
                          topic as keyof typeof FEEDBACK_TOPICS
                        ] ?? topic,
                    )
                    .join(", ")}
                </dd>
              </>
            )}
            {item.category && (
              <>
                <dt className="text-muted-foreground">Category</dt>
                <dd>
                  {PROBLEM_CATEGORIES[
                    item.category as keyof typeof PROBLEM_CATEGORIES
                  ] ?? item.category}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">
              {item.kind === "feedback" ? "Comment" : "Description"}
            </dt>
            <dd className="whitespace-pre-wrap wrap-anywhere">
              {item.body ||
                (item.kind === "feedback"
                  ? "No comment added."
                  : "No description added.")}
            </dd>
            {item.pagePath && (
              <>
                <dt className="text-muted-foreground">Page</dt>
                <dd className="font-mono wrap-anywhere">{item.pagePath}</dd>
              </>
            )}
          </dl>
          {item.requestId && (
            <QuietLink
              to="/requests/$requestId"
              params={{ requestId: item.requestId }}
              className="text-sm font-medium text-primary underline underline-offset-4"
            >
              View associated request
            </QuietLink>
          )}
          <Field>
            <FieldLabel htmlFor="submission-review-status">
              Review status
            </FieldLabel>
            <Select
              value={status}
              onValueChange={(value) => {
                if (value) {
                  setStatus(value);
                  setError(null);
                }
              }}
              disabled={pending}
              items={statusOptions}
            >
              <SelectTrigger id="submission-review-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {statusOptions.map((option) => (
                    <SelectItem value={option.value} key={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Close
          </Button>
          <Button onClick={save} disabled={pending || status === item.status}>
            {pending && <Spinner data-icon="inline-start" />}
            {pending ? "Saving..." : "Save review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminFeedbackPage({
  data,
  filters,
  onFiltersChange,
  onUpdated,
}: {
  data: AdminFeedbackData;
  filters: ReviewFilters;
  onFiltersChange: (value: Partial<ReviewFilters>) => void;
  onUpdated: () => void;
}) {
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const { count, pageSize, summary } = data;
  const percent = satisfactionPercent(summary);
  const columns = useMemo<AppColumnDef<ReviewItem>[]>(
    () => [
      {
        accessorKey: "reference",
        header: "Request / report",
        cell: ({ row }) => (
          <span className="font-mono text-xs wrap-anywhere">
            {row.original.reference}
          </span>
        ),
      },
      {
        accessorKey: "serviceName",
        header: "Service",
        cell: ({ row }) => (
          <span className="block max-w-64 whitespace-normal">
            {row.original.serviceName}
          </span>
        ),
      },
      {
        id: "response",
        header: "Response",
        cell: ({ row }) =>
          row.original.rating !== null ? (
            <span className="inline-flex items-center gap-1.5">
              <Star
                className="size-4 text-primary"
                fill="currentColor"
                aria-hidden="true"
              />
              {row.original.rating}/5
            </span>
          ) : (
            PROBLEM_CATEGORIES[
              row.original.category as keyof typeof PROBLEM_CATEGORIES
            ] || "Other"
          ),
      },
      {
        accessorKey: "createdAt",
        header: "Submitted",
        cell: ({ row }) => dateFormat.format(new Date(row.original.createdAt)),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <ReviewBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Review",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Review ${row.original.reference}`}
            onClick={() => setSelected(row.original)}
          >
            Review
          </Button>
        ),
      },
    ],
    [],
  );
  const tableState = useMemo(
    () => ({
      pagination: { pageIndex: filters.page - 1, pageSize },
    }),
    [filters.page, pageSize],
  );
  const table = useTable({
    features: appTableFeatures,
    data: data.items,
    columns,
    manualPagination: true,
    rowCount: count,
    state: tableState,
  });
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const isFeedback = filters.tab === "feedback";
  const tableLabel = isFeedback ? "Survey feedback" : "Problem reports";
  const emptyLabel = isFeedback
    ? "No feedback matches these filters."
    : "No problem reports match these filters.";
  const itemLabel = isFeedback ? "response" : "report";
  const hasFilters = hasReviewFilters(filters);
  return (
    <div className="dashboard-page">
      <PageHeaderCard
        title="Feedback & Reports"
        description="Understand citizens' experience with Civicheck and review reported problems."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>
              Survey responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {summary.total}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              For the selected service and dates
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>
              Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {percent === null ? "—" : `${percent}%`}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {summary.satisfied} satisfied or very satisfied out of{" "}
              {summary.total} {summary.total === 1 ? "response" : "responses"}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle role="heading" aria-level={2}>
              Overall ratings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2.5">
              {summary.distribution.map((ratingCount, index) => {
                const ratingPercent =
                  summary.total === 0
                    ? 0
                    : Math.round((ratingCount / summary.total) * 100);

                return (
                  <Progress
                    key={index}
                    value={ratingPercent}
                    aria-label={`${SATISFACTION_LABELS[index]}: ${ratingCount} responses`}
                    className="grid grid-cols-[3.25rem_minmax(0,1fr)_2rem] items-center gap-2.5 [&>[data-slot=progress-track]]:col-start-2 [&>[data-slot=progress-track]]:row-start-1"
                  >
                    <ProgressLabel className="col-start-1 row-start-1 text-xs font-normal text-muted-foreground">
                      {index + 1} star{index === 0 ? "" : "s"}
                    </ProgressLabel>
                    <span className="col-start-3 row-start-1 text-right text-xs font-medium tabular-nums">
                      {ratingCount}
                      <span className="sr-only">
                        {ratingCount === 1 ? " response" : " responses"}
                      </span>
                    </span>
                  </Progress>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      <Tabs
        value={filters.tab}
        onValueChange={(value) =>
          onFiltersChange({
            tab: value === "problems" ? "problems" : "feedback",
            page: 1,
          })
        }
        className="gap-4"
      >
        <TabsList variant="pill" aria-label="Feedback review type">
          <TabsTrigger value="feedback">Survey feedback</TabsTrigger>
          <TabsTrigger value="problems">Problem reports</TabsTrigger>
        </TabsList>
        <TabsContent value={filters.tab}>
          <DataTableCard
            table={table}
            label={tableLabel}
            toolbar={
              <Filters
                key={`${filters.service}:${filters.from}:${filters.until}`}
                filters={filters}
                services={data.services}
                onChange={onFiltersChange}
              />
            }
            emptyLabel={emptyLabel}
            onClearFilters={
              hasFilters
                ? () => onFiltersChange(CLEARED_FILTERS)
                : undefined
            }
            footer={
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>
                  {count} {itemLabel}
                  {count === 1 ? "" : "s"}{" "}
                  · Page {filters.page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page <= 1}
                    onClick={() => onFiltersChange({ page: filters.page - 1 })}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page >= totalPages}
                    onClick={() => onFiltersChange({ page: filters.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            }
          />
        </TabsContent>
      </Tabs>
      {selected && (
        <ReviewDialog
          key={selected.id}
          item={selected}
          onClose={() => setSelected(null)}
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
}
