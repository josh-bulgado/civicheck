import { useState } from "react";
import { Check, CircleCheck, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useSecurityCenterActions } from "../hooks/useSecurityCenterActions";
import {
  findingCategoryLabels,
  findingStatusLabels,
  formatSecurityTimestamp,
  severityLabels,
} from "../security-center.utils";
import type {
  SecurityAssignee,
  SecurityFinding,
} from "../system-admin.types";
import { ResolveSecurityFindingDialog } from "./ResolveSecurityFindingDialog";

type FindingFilter = "active" | "all" | "resolved";

function severityVariant(severity: SecurityFinding["severity"]) {
  return severity === "critical" || severity === "high"
    ? "destructive"
    : severity === "medium"
      ? "secondary"
      : "outline";
}

function FindingCard({
  finding,
  assignees,
  isPending,
  onAcknowledge,
  onAssign,
  onResolve,
}: {
  finding: SecurityFinding;
  assignees: SecurityAssignee[];
  isPending: boolean;
  onAcknowledge: () => void;
  onAssign: (assigneeId: string) => void;
  onResolve: () => void;
}) {
  const assigneeItems = assignees.map((assignee) => ({
    value: assignee.id,
    label: assignee.name,
  }));

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={severityVariant(finding.severity)}>
            {severityLabels[finding.severity]}
          </Badge>
          <Badge variant="outline">
            {findingCategoryLabels[finding.category]}
          </Badge>
          <Badge
            variant={finding.status === "resolved" ? "secondary" : "outline"}
          >
            {findingStatusLabels[finding.status]}
          </Badge>
        </div>
        <CardTitle>
          <h3 className="mt-1 text-base font-bold">{finding.title}</h3>
        </CardTitle>
        <CardDescription className="max-w-3xl leading-6">
          {finding.summary}
        </CardDescription>
        <CardAction>
          <time
            dateTime={finding.lastSeenAt}
            className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:block"
          >
            {formatSecurityTimestamp(finding.lastSeenAt)}
          </time>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
        <p>
          <span className="font-semibold text-foreground">Subject:</span>{" "}
          {finding.subjectLabel ?? "Aggregate security signal"}
        </p>
        <p>
          <span className="font-semibold text-foreground">Assigned to:</span>{" "}
          {finding.assignedToLabel ?? "Unassigned"}
        </p>
      </CardContent>
      {finding.status === "resolved" ? (
        <CardFooter className="border-t">
          <p className="text-xs leading-5 text-muted-foreground">
            <span className="font-semibold text-foreground">Resolution:</span>{" "}
            {finding.resolutionNote}
          </p>
        </CardFooter>
      ) : (
        <CardFooter className="flex flex-col items-stretch justify-between gap-3 border-t sm:flex-row sm:items-center">
          <Select
            items={assigneeItems}
            value={finding.assignedToId}
            onValueChange={(value) => {
              if (value) onAssign(value);
            }}
            disabled={isPending || assignees.length === 0}
          >
            <SelectTrigger size="sm" className="w-full sm:w-56">
              <SelectValue placeholder="Assign finding" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {assigneeItems.map((assignee) => (
                  <SelectItem key={assignee.value} value={assignee.value}>
                    {assignee.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap justify-end gap-2">
            {finding.status === "open" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={onAcknowledge}
              >
                {isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Check data-icon="inline-start" />
                )}
                Acknowledge
              </Button>
            ) : null}
            <Button size="sm" disabled={isPending} onClick={onResolve}>
              <CircleCheck data-icon="inline-start" />
              Resolve
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

export function SecurityFindingsSection({
  findings,
  assignees,
}: {
  findings: SecurityFinding[];
  assignees: SecurityAssignee[];
}) {
  const [filter, setFilter] = useState<FindingFilter>("active");
  const [findingToResolve, setFindingToResolve] =
    useState<SecurityFinding | null>(null);
  const { pendingAction, acknowledge, assign, resolve } =
    useSecurityCenterActions();
  const visibleFindings = findings.filter((finding) => {
    if (filter === "active") return finding.status !== "resolved";
    if (filter === "resolved") return finding.status === "resolved";
    return true;
  });

  return (
    <section aria-labelledby="security-findings-title">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Action queue
          </p>
          <h2
            id="security-findings-title"
            className="mt-1 text-xl font-bold tracking-tight"
          >
            Security findings
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acknowledge, assign, and resolve metadata-only findings.
          </p>
        </div>
      </div>

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as FindingFilter)}
      >
        <TabsList aria-label="Filter security findings">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
        <TabsContent value={filter} className="mt-3">
          {visibleFindings.length > 0 ? (
            <div className="flex flex-col gap-3">
              {visibleFindings.map((finding) => {
                const isPending =
                  pendingAction?.type === "finding" &&
                  pendingAction.id === finding.id;
                return (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    assignees={assignees}
                    isPending={isPending}
                    onAcknowledge={() => void acknowledge(finding.id)}
                    onAssign={(assigneeId) =>
                      void assign(finding.id, assigneeId)
                    }
                    onResolve={() => setFindingToResolve(finding)}
                  />
                );
              })}
            </div>
          ) : (
            <Alert variant="success" role="status">
              <ShieldAlert aria-hidden="true" />
              <AlertTitle>No findings in this view</AlertTitle>
              <AlertDescription>
                There are no security findings matching the selected status.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      <ResolveSecurityFindingDialog
        finding={findingToResolve}
        isPending={
          findingToResolve !== null &&
          pendingAction?.type === "finding" &&
          pendingAction.id === findingToResolve.id
        }
        onOpenChange={(open) => {
          if (!open) setFindingToResolve(null);
        }}
        onResolve={(resolution) =>
          findingToResolve
            ? resolve(findingToResolve.id, resolution)
            : Promise.resolve(false)
        }
      />
    </section>
  );
}
