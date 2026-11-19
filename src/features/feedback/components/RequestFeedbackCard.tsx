import {
  useCallback,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { Checkbox } from "~/components/ui/checkbox";
import { Textarea } from "~/components/ui/textarea";
import { Spinner } from "~/components/ui/spinner";
import {
  EASE_LABELS,
  FEEDBACK_TOPICS,
  SATISFACTION_LABELS,
  type FeedbackTopic,
  type RequestFeedback,
} from "../feedback";
import { submitRequestFeedbackFn } from "../feedback.functions";
import { StarRating } from "./StarRating";

const DISMISS_EVENT = "civicheck:feedback-dismissed";
function subscribeDismissal(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(DISMISS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(DISMISS_EVENT, callback);
  };
}

export function RequestFeedbackCard({
  requestId,
  feedback,
  feedbackUnavailable = false,
  requested = false,
  onRequestHandled,
  onUpdated,
}: {
  requestId: string;
  feedback: RequestFeedback | null;
  feedbackUnavailable?: boolean;
  requested?: boolean;
  onRequestHandled: () => void;
  onUpdated: () => void;
}) {
  const key = `civicheck-feedback-dismissed:${requestId}`;
  const getDismissed = useCallback(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  }, [key]);
  const dismissed = useSyncExternalStore(
    subscribeDismissal,
    getDismissed,
    () => false,
  );
  const [dismissedHere, setDismissedHere] = useState(false);
  const [localOpen, setLocalOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [easeRating, setEaseRating] = useState<number | null>(null);
  const [topics, setTopics] = useState<FeedbackTopic[]>([]);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidRating, setInvalidRating] = useState(false);
  const [saved, setSaved] = useState<RequestFeedback | null>(null);
  const submitted = saved ?? feedback;
  const open = !feedbackUnavailable && !submitted && (localOpen || requested);
  const submitFeedback = useServerFn(submitRequestFeedbackFn);

  function close() {
    setLocalOpen(false);
    onRequestHandled();
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!rating) {
      setInvalidRating(true);
      setError("Choose an overall rating before submitting.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await submitFeedback({
        data: { requestId, rating, easeRating, topics, comment },
      });
      if (result.error) {
        setError(result.message);
        return;
      }
      setSaved(result.feedback);
      close();
      toast.success("Thank you for your feedback.");
      onUpdated();
    } catch {
      setError(
        "Your feedback could not be saved. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  if (feedbackUnavailable && !submitted) {
    return (
      <Card variant="soft" aria-label="Feedback unavailable">
        <CardHeader>
          <CardTitle>
            <h2>Feedback is temporarily unavailable</h2>
          </CardTitle>
          <CardDescription>
            We couldn't load your feedback. Try again to view your response or
            give feedback.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={onUpdated}>
            Retry feedback
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <>
      {submitted ? (
        <Card variant="soft" aria-label="Your submitted feedback">
          <CardHeader>
            <CardTitle>
              <h2 className="flex items-center gap-2">
                <CheckCircle2
                  className="size-5 text-primary"
                  aria-hidden="true"
                />
                Thank you for your feedback
              </h2>
            </CardTitle>
            <CardDescription>
              Your response helps us improve Civicheck.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="flex items-center gap-2 font-medium">
              <Star
                className="size-4 text-primary"
                fill="currentColor"
                aria-hidden="true"
              />
              {submitted.rating}/5 · {SATISFACTION_LABELS[submitted.rating - 1]}
            </p>
            <details>
              <summary className="cursor-pointer text-sm font-medium text-primary">
                View your response
              </summary>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                {submitted.ease_rating && (
                  <p>Ease of use: {EASE_LABELS[submitted.ease_rating - 1]}</p>
                )}
                {submitted.topics.length > 0 && (
                  <p>
                    Topics:{" "}
                    {submitted.topics
                      .map((topic) => FEEDBACK_TOPICS[topic])
                      .join(", ")}
                  </p>
                )}
                <p className="whitespace-pre-wrap wrap-anywhere text-muted-foreground">
                  {submitted.comment || "No comment added."}
                </p>
              </div>
            </details>
          </CardContent>
        </Card>
      ) : dismissed || dismissedHere ? (
        <Button variant="ghost" onClick={() => setLocalOpen(true)}>
          <MessageSquare data-icon="inline-start" aria-hidden="true" />
          Give feedback
        </Button>
      ) : (
        <Card variant="soft">
          <CardHeader>
            <CardTitle>
              <h2>How was your experience with Civicheck?</h2>
            </CardTitle>
            <CardDescription>
              Your request is complete. Help us improve the system with a short,
              optional survey.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-wrap gap-2">
            <Button onClick={() => setLocalOpen(true)}>
              <MessageSquare data-icon="inline-start" aria-hidden="true" />
              Give feedback
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDismissedHere(true);
                try {
                  localStorage.setItem(key, "1");
                } catch {
                  /* Storage may be unavailable. */
                }
                window.dispatchEvent(new Event(DISMISS_EVENT));
              }}
            >
              Maybe later
            </Button>
          </CardFooter>
        </Card>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) {
            if (value) setLocalOpen(true);
            else close();
          }
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
          showCloseButton={!pending}
        >
          <DialogHeader>
            <DialogTitle>How was your experience?</DialogTitle>
            <DialogDescription>
              Tell us about using Civicheck for this request. Only your overall
              rating is required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-6">
            <FieldGroup>
              <StarRating
                question="Overall, how satisfied were you with Civicheck?"
                labels={SATISFACTION_LABELS}
                value={rating}
                onChange={(value) => {
                  setRating(value);
                  setInvalidRating(false);
                  setError(null);
                }}
                required
                disabled={pending}
                invalid={invalidRating}
              />
              <StarRating
                question="How easy was it to complete and track your request?"
                labels={EASE_LABELS}
                value={easeRating}
                onChange={setEaseRating}
                disabled={pending}
              />
              <FieldSet disabled={pending} className="gap-3">
                <FieldLegend variant="label" className="mb-0">
                  Which parts would you like to comment on?{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </FieldLegend>
                <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                  {(
                    Object.entries(FEEDBACK_TOPICS) as [FeedbackTopic, string][]
                  ).map(([topic, label]) => (
                    <Field key={topic} orientation="horizontal">
                      <Checkbox
                        id={`feedback-${topic}`}
                        checked={topics.includes(topic)}
                        onCheckedChange={(checked) =>
                          setTopics((current) =>
                            checked
                              ? [...current, topic]
                              : current.filter((item) => item !== topic),
                          )
                        }
                      />
                      <FieldLabel htmlFor={`feedback-${topic}`}>
                        {label}
                      </FieldLabel>
                    </Field>
                  ))}
                </div>
              </FieldSet>
              <Field>
                <FieldLabel htmlFor="feedback-comment">
                  What worked well, or what should we improve?{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </FieldLabel>
                <Textarea
                  id="feedback-comment"
                  rows={3}
                  maxLength={2000}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  disabled={pending}
                />
                <FieldDescription>
                  {comment.length}/2000 characters. Your response is linked to
                  this request and visible to authorized admins.
                </FieldDescription>
              </Field>
            </FieldGroup>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={close}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner data-icon="inline-start" />}
                {pending ? "Submitting..." : "Submit feedback"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
