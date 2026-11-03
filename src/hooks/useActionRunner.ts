import { useCallback, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

/**
 * Runs a server action, tells the person how it went, and refreshes the route's data.
 *
 * `pending` is the action that is running, so a button can show its own spinner while the
 * rest of the screen stays usable. `run` resolves to whether the action succeeded.
 */
export function useActionRunner<TPending>(
  failureMessage: string,
  onRefresh?: () => void | Promise<unknown>,
) {
  const router = useRouter();
  const [pending, setPending] = useState<TPending | null>(null);

  const run = useCallback(
    async (
      action: () => Promise<unknown>,
      next: TPending,
      successMessage: string,
    ) => {
      setPending(next);
      try {
        await action();
        toast.success(successMessage);
        if (onRefresh) await onRefresh();
        else await router.invalidate();
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : failureMessage);
        return false;
      } finally {
        setPending(null);
      }
    },
    [router, failureMessage, onRefresh],
  );

  return { pending, run };
}
