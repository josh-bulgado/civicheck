/** A message body, after trimming, may be 1 to this many characters. */
export const MESSAGE_MAX_LENGTH = 1000;

/** How many messages one sender may post on one request inside the window. */
export const MESSAGE_FLOOD_LIMIT = 10;
export const MESSAGE_FLOOD_WINDOW_MINUTES = 60;

export type MessageSenderRole = "applicant" | "staff";

export interface RequestMessage {
  id: string;
  senderRole: MessageSenderRole;
  /**
   * The sender's name when the viewer is allowed to read it (staff reading a
   * staff message). Null otherwise; the card falls back to a generic label.
   */
  senderName: string | null;
  body: string;
  createdAt: string;
}

export type MessageBodyResult =
  | { ok: true; body: string }
  | { ok: false; message: string };

/**
 * Trims a message and checks its length. The database CHECK is the backstop;
 * this gives the sender a readable reason first. JS counts UTF-16 units, so it
 * is never more lenient than the database's character count.
 */
export function normalizeMessageBody(raw: unknown): MessageBodyResult {
  if (typeof raw !== "string") {
    return { ok: false, message: "Write a message first." };
  }
  const body = raw.replace(/\r\n/g, "\n").trim();
  if (body.length === 0) {
    return { ok: false, message: "Write a message first." };
  }
  if (body.length > MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      message: `Messages can be up to ${MESSAGE_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true, body };
}

/** True once a sender has used up the messages allowed inside the window. */
export function isFlooded(recentCount: number): boolean {
  return recentCount >= MESSAGE_FLOOD_LIMIT;
}

/**
 * Starting points staff can drop into the reply box and edit, picked by where
 * the request stands. Nothing is sent until staff press Send.
 */
export function quickReplies(status: string, feesDue: number, serviceCode?: string): string[] {
  // Email inquiries are handled online; the physical-document prompts do not apply.
  if (serviceCode === "EMAIL_INQUIRY") return [];
  switch (status) {
    case "submitted":
    case "under_validation":
    case "incomplete":
      return ["Please bring the original of the document we flagged."];
    case "processing":
      return [
        feesDue > 0
          ? "Your document is being prepared. Please pay at the cashier."
          : "Your document is being prepared.",
      ];
    case "ready_for_release":
      return ["Your document is ready for pickup."];
    default:
      return [];
  }
}
