import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { getHandoffConcerns } from "../handoff-concerns";
import { formatLogDateTime, type LogEntry } from "../request-history";

export function RequestHandoffConcerns({
  status, logs, attachments, onViewHistory,
}: {
  status: string | null;
  logs: readonly LogEntry[];
  attachments: readonly { requirementName: string; verificationStatus: string }[];
  onViewHistory: () => void;
}) {
  const concerns = getHandoffConcerns(status, logs, attachments);
  if (concerns.length === 0) return null;
  return (
    <Alert variant="warning">
      <AlertTriangle aria-hidden="true" />
      <AlertTitle>Needs recheck before continuing</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 flex flex-col gap-3">
          {concerns.map((concern) => (
            <li key={concern.id} className="min-w-0">
              <p className="font-semibold break-words">{concern.title}</p>
              <p className="whitespace-pre-wrap break-words">{concern.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {concern.actorName} · <time dateTime={concern.createdAt}>{formatLogDateTime(concern.createdAt)}</time>
              </p>
            </li>
          ))}
        </ul>
        <Button variant="ghost" size="sm" className="mt-2" onClick={onViewHistory}>
          View history
        </Button>
      </AlertDescription>
    </Alert>
  );
}
