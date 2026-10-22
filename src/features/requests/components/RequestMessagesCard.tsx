import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { postRequestMessageFn } from "~/features/requests/request-messages.mutations";
import {
  MESSAGE_MAX_LENGTH,
  type MessageSenderRole,
  type RequestMessage,
} from "~/features/requests/request-messages";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface RequestMessagesCardProps {
  requestId: string;
  messages: RequestMessage[];
  /** Who is looking, which decides whose messages read as "You". */
  viewer: MessageSenderRole;
  /** Called after a message is sent, so the route can re-run its loader. */
  onSent: () => void;
  /**
   * The applicant page's softer card; staff keep the default. `bare` drops the
   * card and its heading, for a drawer or tab that already has its own title.
   */
  variant?: "dashboard" | "portal" | "bare";
}

function senderLabel(message: RequestMessage, viewer: MessageSenderRole) {
  if (message.senderRole === viewer) return "You";
  if (message.senderRole === "applicant") return "Applicant";
  return message.senderName ?? "CCRO staff";
}

/**
 * Sits in the narrow right-hand column of a request page, so the thread is a
 * fixed-height scroll region (it never pushes the rest of the column down) with
 * the newest message in view and the composer pinned below it.
 */
export function RequestMessagesCard({
  requestId,
  messages,
  viewer,
  onSent,
  variant = "dashboard",
}: RequestMessagesCardProps) {
  const portal = variant === "portal";
  const bare = variant === "bare";
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const trimmed = draft.trim();

  // Newest message in view: on first render and whenever one arrives.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  async function handleSend() {
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await postRequestMessageFn({
        data: { requestId, body: trimmed },
      });
      if (res.error) {
        toast.error(res.message);
        return;
      }
      setDraft("");
      onSent();
    } catch {
      toast.error("We couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const inputId = `message-draft-${requestId}`;

  return (
    <section
      className={
        portal
          ? "min-w-0 rounded-[28px] bg-card p-6 shadow-portal-card md:p-7"
          : bare
            ? "min-w-0"
            : "dashboard-panel min-w-0 p-5"
      }
    >
      {!bare && (
        <h2
          className={
            portal
              ? "text-[22px] leading-[normal] font-semibold text-foreground"
              : "text-lg font-bold text-foreground"
          }
        >
          {viewer === "applicant" ? "Messages with CCRO" : "Messages with the applicant"}
        </h2>
      )}
      <p className={bare ? "mb-3 text-xs text-muted-foreground" : "mb-3 mt-1 text-xs text-muted-foreground"}>
        Don't send passwords or payment details here.
      </p>

      {messages.length === 0 ? (
        <p className="mb-3 text-sm italic text-muted-foreground">
          {viewer === "applicant"
            ? "Have a question about this request? Send a message to CCRO."
            : "No messages yet. Write to the applicant if you need more information."}
        </p>
      ) : (
        // A keyboard-reachable scroll region: focusable so arrow keys scroll it,
        // with a visible focus ring, and `log` so new messages are announced.
        <div
          ref={listRef}
          role="log"
          aria-label="Messages"
          tabIndex={0}
          className={`mb-3 overflow-y-auto overscroll-contain rounded-md pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${bare ? "max-h-[55vh]" : "max-h-72"}`}
        >
          <ol className="flex flex-col gap-2">
            {messages.map((message) => {
              const mine = message.senderRole === viewer;
              return (
                <li
                  key={message.id}
                  className={
                    mine
                      ? "rounded-lg border border-primary/25 bg-primary/5 p-2.5"
                      : "rounded-lg border border-border bg-card p-2.5"
                  }
                >
                  <div className="mb-0.5 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted-foreground">
                    <span className="min-w-0 truncate font-semibold text-foreground">
                      {senderLabel(message, viewer)}
                    </span>
                    <time dateTime={message.createdAt}>
                      {formatDateTime(message.createdAt)}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                    {message.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <label htmlFor={inputId} className="sr-only">
        Message
      </label>
      <Textarea
        id={inputId}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={MESSAGE_MAX_LENGTH}
        rows={2}
        className="max-h-32 min-h-16"
        placeholder={
          viewer === "applicant"
            ? "Write your question or reply…"
            : "Write your reply…"
        }
        disabled={sending}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {draft.length} / {MESSAGE_MAX_LENGTH}
        </span>
        <Button size="sm" onClick={handleSend} disabled={!trimmed || sending}>
          <Send data-icon="inline-start" aria-hidden="true" />
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </section>
  );
}
