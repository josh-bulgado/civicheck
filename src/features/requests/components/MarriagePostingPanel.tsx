import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { formatDateKey } from "~/lib/date";
import { marriagePostingEnd, marriagePostingMessage, needsMarriagePosting, postingToday } from "../marriage-posting";
import { usePostingToday } from "../hooks/usePostingToday";
import { saveMarriagePostingFn } from "../requests.mutations";

interface MarriagePostingPanelProps {
  serviceCode?: string | null;
  status: string | null;
  postingStartDate: string | null;
  postingEndDate: string | null;
  showGuidance?: boolean;
  editor?: { requestId: string; updatedAt: string; createdAt: string; onSaved: () => void | Promise<unknown> };
}

export function MarriagePostingPanel(props: MarriagePostingPanelProps) {
  const applicable = needsMarriagePosting(props.serviceCode);
  const today = usePostingToday(applicable && props.status === "processing");
  const inputId = useId();
  const [date, setDate] = useState(props.postingStartDate ?? "");
  const [saving, setSaving] = useState(false);
  if (!applicable || !["processing", "ready_for_release", "released"].includes(props.status ?? "")) return null;
  const end = props.postingEndDate ?? marriagePostingEnd(props.postingStartDate);
  const editor = props.status === "processing" ? props.editor : undefined;

  async function save() {
    if (!editor) return;
    setSaving(true);
    try {
      const result = await saveMarriagePostingFn({ data: {
        requestId: editor.requestId, postingStartDate: date, expectedUpdatedAt: editor.updatedAt,
      } });
      if (result.error) {
        toast.error(result.message);
        return;
      }
      toast.success("Posting date saved.");
      await editor.onSaved();
    } catch {
      toast.error("Could not save the posting date. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 text-sm">
      <h2 className="text-lg font-semibold">10-day notice of posting</h2>
      {(props.showGuidance !== false || props.postingStartDate) ? (
        <p className="mt-2 text-muted-foreground" aria-live="polite">
          {marriagePostingMessage(props.postingStartDate, today, props.serviceCode)}
        </p>
      ) : null}
      {props.postingStartDate && end && (
        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
          <div><dt className="text-muted-foreground">Posted on</dt><dd className="font-medium">{formatDateKey(props.postingStartDate)}</dd></div>
          <div><dt className="text-muted-foreground">Posting completion date</dt><dd className="font-medium">{formatDateKey(end)}</dd></div>
        </dl>
      )}
      {props.showGuidance !== false ? (
        <p className="mt-3 text-muted-foreground">The period includes weekends and holidays. Completion does not automatically make the document ready for collection.</p>
      ) : null}
      {editor && (
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="flex flex-col gap-2">
            <label htmlFor={inputId} className="font-medium">Actual notice-posting date</label>
            <Input id={inputId} type="date" required value={date} max={today}
              min={postingToday(new Date(editor.createdAt))} disabled={saving}
              onChange={(event) => setDate(event.target.value)} />
          </div>
          <Button type="submit" disabled={saving || !date || date > today || date === props.postingStartDate}>
            {saving ? "Saving..." : "Save posting date"}
          </Button>
        </form>
      )}
    </section>
  );
}
