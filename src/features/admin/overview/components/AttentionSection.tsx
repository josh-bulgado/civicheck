import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { formatCount } from "~/features/admin/overview/overview-formatters";
import { cn } from "~/lib/utils";

interface AttentionSectionProps {
  incompleteRequests: number;
  unpaidReleaseRequests: number;
}

export function AttentionSection({
  incompleteRequests,
  unpaidReleaseRequests,
}: AttentionSectionProps) {
  const hasAttentionItems =
    incompleteRequests > 0 || unpaidReleaseRequests > 0;

  return (
    <section aria-labelledby="attention-heading" className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          Follow-up Needed
        </p>
        <h2
          className="mt-1 scroll-mt-24 text-balance text-xl font-bold tracking-tight"
          id="attention-heading"
        >
          Items Requiring Attention
        </h2>
      </div>

      {hasAttentionItems ? null : (
        <Alert variant="success">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>No Urgent Follow-up Items</AlertTitle>
          <AlertDescription>
            There are no incomplete requests or unpaid requests waiting for
            release right now.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <IncompleteRequestsCard count={incompleteRequests} />
        <UnpaidReleaseCard count={unpaidReleaseRequests} />
      </div>
    </section>
  );
}

function IncompleteRequestsCard({ count }: { count: number }) {
  return (
    <AttentionCard
      badgeLabel="Needs Follow-up"
      badgeVariant={count > 0 ? "destructive" : "secondary"}
      count={count}
      countLabel="open requests"
      description="Requests waiting for missing information or staff follow-up."
      icon={CircleAlert}
      iconClassName="bg-destructive/10 text-destructive"
      title="Incomplete Submissions"
      action={
        <Link
          to="/requests"
          search={{ status: "incomplete" }}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Review Incomplete Requests
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      }
    />
  );
}

function UnpaidReleaseCard({ count }: { count: number }) {
  return (
    <AttentionCard
      badgeLabel="Payment Check"
      badgeVariant={count > 0 ? "outline" : "secondary"}
      count={count}
      countLabel="awaiting payment"
      description="Approved documents that cannot be released until payment is verified."
      icon={Clock3}
      iconClassName="bg-warning-soft text-warning"
      title="Release Pending Payment"
      action={
        <Link
          to="/requests"
          search={{ status: "ready_for_release", payment: "unpaid" }}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Review Release Queue
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
      }
    />
  );
}

interface AttentionCardProps {
  action: ReactNode;
  badgeLabel: string;
  badgeVariant: "destructive" | "outline" | "secondary";
  count: number;
  countLabel: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  title: string;
}

function AttentionCard({
  action,
  badgeLabel,
  badgeVariant,
  count,
  countLabel,
  description,
  icon: Icon,
  iconClassName,
  title,
}: AttentionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3 className="text-balance">{title}</h3>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-lg",
              iconClassName,
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-3xl font-extrabold tracking-tight tabular-nums">
              {formatCount(count)}
            </p>
            <p className="text-xs text-muted-foreground">{countLabel}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end">{action}</CardFooter>
    </Card>
  );
}
