import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";
import { getAccountHistory } from "../system-admin.functions";
import type { AccountHistoryEvent, AccountSummary } from "../system-admin.types";

type HistoryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; events: AccountHistoryEvent[] };

function HistoryBody({ accountId }: { accountId: string }) {
  const [state, setState] = useState<HistoryState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getAccountHistory({ data: { targetId: accountId } })
      .then((events) => {
        if (!cancelled) setState({ status: "ready", events });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "The history could not be loaded.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Spinner />
        Loading history
      </div>
    );
  }
  if (state.status === "error") {
    return <p className="py-6 text-sm text-destructive">{state.message}</p>;
  }
  if (!state.events.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No administrative actions or sign-ins have been recorded for this account.
      </p>
    );
  }

  return (
    <ol className="max-h-80 space-y-4 overflow-y-auto border-l border-border pl-4">
      {state.events.map((event) => (
        <li key={event.id} className="relative">
          <span
            className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary"
            aria-hidden="true"
          />
          <p className="text-sm font-medium capitalize text-foreground">
            {event.eventType.replaceAll("_", " ")}
          </p>
          <p className="text-xs text-muted-foreground">
            {event.actor} · {new Date(event.timestamp).toLocaleString()}
          </p>
          {event.reason ? (
            <p className="mt-1 text-sm text-foreground/80">
              Reason: {event.reason}
            </p>
          ) : null}
          {event.detail ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {event.detail}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * Timeline of administrative actions taken on an account — suspensions,
 * reactivations, detail edits, reset links — read from the audit log.
 */
export function AccountHistoryDialog({
  account,
  onOpenChange,
}: {
  account: AccountSummary | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {account ? (
          <>
            <DialogHeader>
              <DialogTitle>Account history</DialogTitle>
              <DialogDescription>
                {account.email} — administrator actions and recent personnel
                sign-ins.
              </DialogDescription>
            </DialogHeader>
            <HistoryBody key={account.id} accountId={account.id} />
            <DialogFooter>
              <Button
                variant="outline"
                render={
                  <Link
                    to="/system-admin/audit"
                    search={{ page: 1, source: "all", account: account.id }}
                  />
                }
              >
                <ScrollText />
                View all activity
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
