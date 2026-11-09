import { useEffect, useState, type FormEvent } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Spinner } from "~/components/ui/spinner";
import { PROBLEM_CATEGORIES, type ProblemCategory } from "../feedback";
import { submitProblemReportFn } from "../feedback.functions";
import { OPEN_PROBLEM_REPORT } from "../problem-report-events";

export function ReportProblemDialog() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState({
    pagePath: "",
    requestId: null as string | null,
  });
  const [category, setCategory] = useState<ProblemCategory | null>(null);
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const submitReport = useServerFn(submitProblemReportFn);

  useEffect(() => {
    function show() {
      const requestId =
        /^\/my-requests\/([0-9a-f-]{36})\/?$/i.exec(pathname)?.[1] ?? null;
      setContext({ pagePath: pathname.slice(0, 500), requestId });
      setReference(null);
      setCategory(null);
      setDescription("");
      setError(null);
      setAttempted(false);
      setOpen(true);
    }
    window.addEventListener(OPEN_PROBLEM_REPORT, show);
    return () => window.removeEventListener(OPEN_PROBLEM_REPORT, show);
  }, [pathname]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setAttempted(true);
    if (!category || !description.trim()) {
      setError("Choose a category and describe the problem.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await submitReport({
        data: { ...context, category, description },
      });
      if (result.error) {
        setError(result.message);
        return;
      }
      setReference(result.reference);
      setCategory(null);
      setDescription("");
      setAttempted(false);
    } catch {
      setError(
        "Your report could not be saved. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) setOpen(value);
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!pending}
      >
        <DialogHeader>
          <DialogTitle>
            {reference
              ? "Your problem report was received"
              : "Report a problem with Civicheck"}
          </DialogTitle>
          <DialogDescription>
            {reference
              ? "An administrator can now review your report."
              : "Tell us what happened so we can investigate. You can report a problem at any stage of your request."}
          </DialogDescription>
        </DialogHeader>
        {reference ? (
          <div className="flex flex-col gap-5">
            <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
            <p role="status">
              Your reference is{" "}
              <strong className="font-mono">{reference}</strong>. Keep this for
              your records.
            </p>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-6">
            <FieldGroup>
              <Field data-invalid={(attempted && !category) || undefined}>
                <FieldLabel htmlFor="problem-category">
                  What is the problem about?
                </FieldLabel>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value)}
                  disabled={pending}
                  items={Object.entries(PROBLEM_CATEGORIES).map(
                    ([value, label]) => ({ value, label }),
                  )}
                >
                  <SelectTrigger
                    id="problem-category"
                    className="w-full"
                    aria-invalid={(attempted && !category) || undefined}
                  >
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(PROBLEM_CATEGORIES).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field
                data-invalid={(attempted && !description.trim()) || undefined}
              >
                <FieldLabel htmlFor="problem-description">
                  Describe the problem
                </FieldLabel>
                <Textarea
                  id="problem-description"
                  rows={5}
                  maxLength={2000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={pending}
                  aria-invalid={(attempted && !description.trim()) || undefined}
                  placeholder="What were you trying to do, and what happened?"
                />
                <FieldDescription>
                  {description.length}/2000 characters.
                </FieldDescription>
              </Field>
            </FieldGroup>
            <p className="text-sm text-muted-foreground">
              We will include the current page
              {context.requestId ? " and request" : ""} to help investigate.
              Your report is linked to your account and visible to authorized
              admins.
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner data-icon="inline-start" />}
                {pending ? "Submitting..." : "Submit report"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
