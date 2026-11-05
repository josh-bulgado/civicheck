import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DOCUMENT_DECISION_TOASTER_ID } from "~/components/ui/sonner";

export type Decision = "approved" | "rejected";

interface Held {
  timer: number;
  toastId?: string | number;
  status: Decision;
  reason?: string;
  onUndo?: () => void;
}

/** A decision waiting out the undo window, shown as if it were saved. */
export interface WaitingDecision {
  status: Decision;
  reason: string | null;
}

export interface QueuedDecisions {
  waiting: Record<string, WaitingDecision>;
  queue: (
    id: string,
    status: Decision,
    reason: string | undefined,
    options: { label: string; onUndo?: () => void },
  ) => void;
  cancel: (id: string) => void;
  /** Takes back the newest decision still waiting; returns whether one was. */
  cancelLast: () => boolean;
  /** Saves every waiting decision now. False means at least one save lost a race. */
  flush: () => Promise<boolean>;
}

export interface DecisionSaveOptions {
  /** False when a following request transition will refresh once for the batch. */
  refresh?: boolean;
}

/** How long a decision can be taken back before it is saved. */
export const UNDO_SECONDS = 10;
export const UNDO_MS = UNDO_SECONDS * 1000;

/**
 * Holds accept and reject decisions for a few seconds, so a slip can be undone
 * without a confirm dialog, then saves them. While held, `waiting` carries the
 * decision so the page can show it as made. A decision still held when the page
 * is left is saved at that point, never dropped.
 */
export function useQueuedDecisions(
  onDecide: (
    id: string,
    status: Decision,
    reason?: string,
    options?: DecisionSaveOptions,
  ) => Promise<boolean>,
): QueuedDecisions {
  const [waiting, setWaiting] = useState<Record<string, WaitingDecision>>({});
  const held = useRef(new Map<string, Held>());
  const newest = useRef<string | null>(null);
  const onDecideRef = useRef(onDecide);
  onDecideRef.current = onDecide;

  const forget = useCallback((id: string) => {
    setWaiting((current) => {
      if (!(id in current)) return current;
      const { [id]: _done, ...rest } = current;
      return rest;
    });
  }, []);

  const save = useCallback(
    async (id: string, item: Held, options?: DecisionSaveOptions) => {
      held.current.delete(id);
      window.clearTimeout(item.timer);
      try {
        return await onDecideRef.current(id, item.status, item.reason, options);
      } finally {
        // Keep the optimistic row through the save attempt. A failed attempt
        // refreshes from the server so another staff member's decision wins.
        forget(id);
      }
    },
    [forget],
  );

  const cancel = useCallback(
    (id: string) => {
      const item = held.current.get(id);
      if (!item) return;
      window.clearTimeout(item.timer);
      held.current.delete(id);
      forget(id);
      item.onUndo?.();
    },
    [forget],
  );

  const queue = useCallback<QueuedDecisions["queue"]>(
    (id, status, reason, { label, onUndo }) => {
      setWaiting((current) => ({
        ...current,
        [id]: { status, reason: reason ?? null },
      }));
      const item: Held = {
        status,
        reason,
        onUndo,
        timer: window.setTimeout(() => void save(id, item), UNDO_MS),
      };
      held.current.set(id, item);
      newest.current = id;
      item.toastId = toast(`${status === "approved" ? "Accepted" : "Rejected"}: ${label}`, {
        duration: UNDO_MS,
        toasterId: DOCUMENT_DECISION_TOASTER_ID,
        style: {
          minHeight: "5rem",
          padding: "1rem 1.25rem",
          gap: "0.75rem",
          fontSize: "0.9375rem",
        },
        action: {
          label: "Undo",
          onClick: () => cancel(id),
          actionButtonStyle: {
            height: "2.75rem",
            paddingInline: "1rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.875rem",
          },
        },
      });
    },
    [save, cancel],
  );

  const cancelLast = useCallback(() => {
    const id = newest.current;
    if (!id || !held.current.has(id)) return false;
    cancel(id);
    return true;
  }, [cancel]);

  const flush = useCallback(async () => {
    const saved = await Promise.all(
      [...held.current].map(([id, item]) =>
        save(id, item, { refresh: false }),
      ),
    );
    return saved.every(Boolean);
  }, [save]);

  useEffect(() => {
    const pending = held.current;
    return () => {
      for (const [id, item] of pending) {
        window.clearTimeout(item.timer);
        // The decision is saved now, so its Undo toast would do nothing.
        toast.dismiss(item.toastId);
        void onDecideRef.current(id, item.status, item.reason, { refresh: false });
      }
      pending.clear();
    };
  }, []);

  return { waiting, queue, cancel, cancelLast, flush };
}
