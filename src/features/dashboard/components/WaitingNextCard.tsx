import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { DeskRequestRow } from "~/features/dashboard/components/DeskRequestRow";
import type { DeskRequest } from "~/features/dashboard/staff-desk";
import { formatCount } from "~/features/admin/overview/overview-formatters";

interface WaitingNextCardProps {
  /** The staff's requests after the one in Next up, longest wait first. */
  requests: DeskRequest[];
  /** How many more wait on staff than this card names. */
  hidden: number;
}

/** The requests to take after the next one. The queue holds the rest. */
export function WaitingNextCard({ requests, hidden }: WaitingNextCardProps) {
  return (
    <Card variant="quiet" size="sm" className="gap-0 pb-0">
      <CardHeader className="pb-3">
        <CardTitle>
          <h2 className="text-lg font-bold">Then</h2>
        </CardTitle>
        <CardDescription>Longest wait first, waiting on staff</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-0 px-0">
        {requests.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Nothing else is waiting on you.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {requests.map((request) => (
              <li key={request.id}>
                <DeskRequestRow request={request} />
              </li>
            ))}
          </ul>
        )}
        {hidden > 0 ? (
          <Link
            to="/requests"
            search={{ needs: true }}
            className="civic-nudge mt-auto inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-5 py-2 text-base font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            + {formatCount(hidden)} More in the Request Queue
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
