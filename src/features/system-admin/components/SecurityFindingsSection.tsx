import { useState } from "react";
import { Check, CircleCheck, ShieldCheck } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useSecurityCenterActions } from "../hooks/useSecurityCenterActions";
import {
  findingCategoryLabels,
  formatSecurityClock,
  formatSecurityDate,
  severityBadgeVariant,
  severityLabels,
} from "../security-center.utils";
import type {
  SecurityAssignee,
  SecurityFinding,
} from "../system-admin.types";
import { ResolveSecurityFindingDialog } from "./ResolveSecurityFindingDialog";

type FindingFilter = "active" | "all" | "resolved";

const filterCountLabels: Record<FindingFilter, string> = {
  active: "unresolved",
  all: "total",
  resolved: "resolved",
};

function FindingRow({
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
  const isResolved = finding.status === "resolved";
  const assigneeItems = assignees.map((assignee) => ({
    value: assignee.id,
    label: assignee.name,
  }));

  return (
    <TableRow>
      <TableCell>
        <Badge variant={severityBadgeVariant(finding.severity)}>
          {severityLabels[finding.severity]}
        </Badge>
      </TableCell>
      <TableCell className="security-cell-wrap">
        <p className="security-cell-title">{finding.title}</p>
        <p className="security-cell-sub">{finding.summary}</p>
        {finding.subjectLabel ? (
          <p className="security-cell-sub">Subject: {finding.subjectLabel}</p>
        ) : null}
        {isResolved && finding.resolutionNote ? (
          <p className="security-cell-sub">
            <span className="font-semibold text-foreground">Resolution:</span>{" "}
            {finding.resolutionNote}
          </p>
        ) : null}
      </TableCell>
      <TableCell>
        <Badge variant="neutral">
          {findingCategoryLabels[finding.category]}
        </Badge>
      </TableCell>
      <TableCell>
        {isResolved ? (
          <span className="security-assignee-none">
            {finding.assignedToLabel ?? "Unassigned"}
          </span>
        ) : (
          <Select
            items={assigneeItems}
            value={finding.assignedToId}
            onValueChange={(value) => {
              if (value) onAssign(value);
            }}
            disabled={isPending || assignees.length === 0}
          >
            <SelectTrigger
              size="sm"
              className="security-assignee"
              aria-label={`Assign "${finding.title}"`}
            >
              <SelectValue placeholder="Unassigned" />
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
        )}
      </TableCell>
      <TableCell>
        <time dateTime={finding.lastSeenAt}>
          <span className="security-cell-title block">
            {formatSecurityDate(finding.lastSeenAt)}
          </span>
          <span className="security-cell-sub block">
            {formatSecurityClock(finding.lastSeenAt)}
          </span>
        </time>
      </TableCell>
      <TableCell>
        <div className="security-actions">
          {isResolved ? (
            <Badge variant="success">
              <CircleCheck data-icon="inline-start" aria-hidden="true" />
              Resolved
            </Badge>
          ) : (
            <>
              {finding.status === "open" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="security-pill-button"
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
              ) : (
                <Badge variant="info">Acknowledged</Badge>
              )}
              <Button size="sm" disabled={isPending} onClick={onResolve}>
                <CircleCheck data-icon="inline-start" />
                Resolve
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
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
    <section aria-label="Security findings" className="security-card">
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as FindingFilter)}
        className="gap-0"
      >
        <div className="security-card-header">
          <TabsList
            aria-label="Filter security findings"
            className="security-segmented"
          >
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
          <p className="security-toolbar-count" aria-live="polite">
            {visibleFindings.length} {filterCountLabels[filter]}
          </p>
        </div>
        <TabsContent value={filter}>
          {visibleFindings.length > 0 ? (
            <Table className="security-table">
              <TableCaption className="sr-only">
                Security findings with severity, owner, and available actions
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Finding</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleFindings.map((finding) => (
                  <FindingRow
                    key={finding.id}
                    finding={finding}
                    assignees={assignees}
                    isPending={
                      pendingAction?.type === "finding" &&
                      pendingAction.id === finding.id
                    }
                    onAcknowledge={() => void acknowledge(finding.id)}
                    onAssign={(assigneeId) =>
                      void assign(finding.id, assigneeId)
                    }
                    onResolve={() => setFindingToResolve(finding)}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="security-empty" role="status">
              <ShieldCheck aria-hidden="true" />
              <p>No security findings match this view.</p>
            </div>
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
