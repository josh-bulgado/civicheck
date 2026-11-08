import { useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTable } from "@tanstack/react-table";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { QuietLink } from "~/components/quiet-link";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DataTableCard } from "~/components/ui/data-table-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PageHeaderCard } from "~/components/ui/page-header-card";
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
  type FeedbackStatus,
  type ProblemStatus,
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

function Filters({
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
  function apply(event: FormEvent) {
    event.preventDefault();
    onChange({ service, from, until, page: 1 });
  }
  return (
    <form onSubmit={apply} className="w-full">
      <FieldGroup className="flex-row flex-wrap items-end gap-3">
        <Field className="min-w-44 flex-1">
          <FieldLabel htmlFor="review-service">Service</FieldLabel>
          <Select
            value={service}
            onValueChange={(value) => setService(value ?? "")}
            items={[
              { value: "", label: "All services" },
              ...services.map((item) => ({
                value: item.code,
                label: item.name,
              })),
            ]}
          >
            <SelectTrigger id="review-service" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">All services</SelectItem>
                {services.map((item) => (
                  <SelectItem value={item.code} key={item.code}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-40">
          <FieldLabel htmlFor="review-from">From</FieldLabel>
          <Input
            id="review-from"
            type="date"
            value={from}
            max={until || "9999-12-31"}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field className="w-40">
          <FieldLabel htmlFor="review-until">Through</FieldLabel>
          <Input
            id="review-until"
            type="date"
            value={until}
            min={from || undefined}
            max="9999-12-31"
            onChange={(event) => setUntil(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
        {(filters.service || filters.from || filters.until) && (
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              onChange({ service: "", from: "", until: "", page: 1 })
            }
          >
            Clear filters
          </Button>
        )}
      </FieldGroup>
    </form>
  );
}

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
  const statuses =
    item.kind === "feedback" ? FEEDBACK_STATUSES : PROBLEM_STATUSES;
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
            {item.reference} · {dateFormat.format(new Date(item.createdAt))}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="font-medium wrap-anywhere">{item.serviceName}</p>
          {item.rating !== null && (
            <p className="flex items-center gap-2">
              <Star
                className="size-5 text-primary"
                fill="currentColor"
                aria-hidden="true"
              />
              {item.rating}/5 · {SATISFACTION_LABELS[item.rating - 1]}
            </p>
          )}
          {item.easeRating !== null && (
            <p className="text-sm">
              Ease of use: {EASE_LABELS[item.easeRating - 1]}
            </p>
          )}
          {item.topics.length > 0 && (
            <p className="text-sm">
              Topics:{" "}
              {item.topics
                .map(
                  (topic) =>
                    FEEDBACK_TOPICS[topic as keyof typeof FEEDBACK_TOPICS] ??
                    topic,
                )
                .join(", ")}
            </p>
          )}
          {item.category && (
            <p className="text-sm">
              Category:{" "}
              {PROBLEM_CATEGORIES[
                item.category as keyof typeof PROBLEM_CATEGORIES
              ] ?? item.category}
            </p>
          )}
          <p className="whitespace-pre-wrap wrap-anywhere text-sm text-muted-foreground">
            {item.body || "No comment added."}
          </p>
          {item.pagePath && (
            <p className="text-sm wrap-anywhere">
              Page: <span className="font-mono">{item.pagePath}</span>
            </p>
          )}
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
                if (value) setStatus(value);
              }}
              disabled={pending}
              items={Object.entries(statuses).map(([value, label]) => ({
                value,
                label,
              }))}
            >
              <SelectTrigger id="submission-review-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.entries(statuses).map(([value, label]) => (
                    <SelectItem value={value} key={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
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
  const percent = satisfactionPercent(data.summary);
  const columns = useMemo<AppColumnDef<ReviewItem>[]>(
    () => [
      {
        accessorKey: "reference",
        header: "Request / report",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.reference}</span>
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
        cell: ({ row }) => (
          <ReviewBadge
            status={row.original.status as FeedbackStatus | ProblemStatus}
          />
        ),
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
  const table = useTable({
    features: appTableFeatures,
    data: data.items,
    columns,
    manualPagination: true,
    rowCount: data.count,
    state: {
      pagination: { pageIndex: filters.page - 1, pageSize: data.pageSize },
    },
  });
  const totalPages = Math.max(1, Math.ceil(data.count / data.pageSize));
  return (
    <div className="dashboard-page">
      <PageHeaderCard
        title="Feedback & Reports"
        description="Understand citizens' experience with Civicheck and review reported problems."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Survey responses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {data.summary.total}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              For the selected service and dates
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {percent === null ? "—" : `${percent}%`}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.summary.satisfied} satisfied or very satisfied out of{" "}
              {data.summary.total}{" "}
              {data.summary.total === 1 ? "response" : "responses"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overall ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5">
              {data.summary.distribution.map((count, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <span className="w-12 shrink-0 whitespace-nowrap">
                    {index + 1} star{index ? "s" : ""}
                  </span>
                  <meter
                    className="h-3 min-w-0 flex-1 accent-primary-fill"
                    min={0}
                    max={Math.max(1, data.summary.total)}
                    value={count}
                    aria-label={`${SATISFACTION_LABELS[index]}: ${count} responses`}
                  />
                  <span className="w-7 text-right tabular-nums">{count}</span>
                </div>
              ))}
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
        <TabsList variant="pill">
          <TabsTrigger value="feedback">Survey feedback</TabsTrigger>
          <TabsTrigger value="problems">Problem reports</TabsTrigger>
        </TabsList>
        <TabsContent value={filters.tab}>
          <DataTableCard
            table={table}
            label={
              filters.tab === "feedback" ? "Survey feedback" : "Problem reports"
            }
            toolbar={
              <Filters
                key={`${filters.service}:${filters.from}:${filters.until}`}
                filters={filters}
                services={data.services}
                onChange={onFiltersChange}
              />
            }
            emptyLabel={
              filters.tab === "feedback"
                ? "No feedback matches these filters."
                : "No problem reports match these filters."
            }
            onClearFilters={
              filters.service || filters.from || filters.until
                ? () =>
                    onFiltersChange({
                      service: "",
                      from: "",
                      until: "",
                      page: 1,
                    })
                : undefined
            }
            footer={
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-sm text-muted-foreground">
                <span>
                  {data.count}{" "}
                  {filters.tab === "feedback"
                    ? data.count === 1
                      ? "response"
                      : "responses"
                    : data.count === 1
                      ? "report"
                      : "reports"}{" "}
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
