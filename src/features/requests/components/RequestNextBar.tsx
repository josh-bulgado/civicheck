import { useId, useState } from "react";
import { Lock, MessageSquarePlus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { RequestActionPlan } from "~/features/requests/request-actions";

/**
 * The band at the foot of the header. It always says where the request stands and what
 * comes next, and when the main button is disabled it says why, so staff never
 * have to guess. A note to the applicant is one click away, for the steps that
 * don't ask for a reason of their own.
 */
export function RequestNextBar({
  summary,
  plan,
  note,
  onNoteChange,
}: {
  summary: string;
  plan: RequestActionPlan;
  note: string;
  onNoteChange: (note: string) => void;
}) {
  const noteId = useId();
  const [noteOpen, setNoteOpen] = useState(false);
  const { primary } = plan;
  // Dialog actions collect their own message, so a loose note would be ignored.
  const canAddNote = primary != null && primary.dialog == null;
  const detail = plan.notice ?? primary?.blocked ?? primary?.effect;

  return (
    <div
      role="status"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <p className="min-w-0 text-sm">
          <span className="mr-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Next
          </span>
          <span className="text-foreground">{summary}</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {detail && (
            <p
              className={
                primary?.blocked
                  ? "flex items-center gap-1.5 text-xs font-medium text-warning-strong"
                  : "text-xs text-muted-foreground"
              }
            >
              {primary?.blocked && <Lock className="size-3.5" aria-hidden="true" />}
              {detail}
            </p>
          )}
          {canAddNote && (
            <Button
              variant="ghost"
              size="xs"
              aria-expanded={noteOpen}
              aria-controls={noteId}
              onClick={() => setNoteOpen((open) => !open)}
            >
              <MessageSquarePlus data-icon="inline-start" aria-hidden="true" />
              {note.trim() ? "Edit note" : "Add a note"}
            </Button>
          )}
        </div>
      </div>

      {canAddNote && noteOpen && (
        <div id={noteId} className="civic-enter-sm flex flex-col gap-1.5">
          <Label htmlFor={`${noteId}-text`} className="text-xs">
            Note for the applicant (optional)
          </Label>
          <Textarea
            id={`${noteId}-text`}
            rows={2}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="What should the applicant know?"
          />
        </div>
      )}
    </div>
  );
}
