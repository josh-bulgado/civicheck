import { useCallback, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  manageSecurityFinding,
  reviewSecurityControl,
} from "../security-center.functions";

type PendingSecurityAction =
  | { type: "finding"; id: string }
  | { type: "control"; id: string }
  | null;

export function useSecurityCenterActions() {
  const router = useRouter();
  const [pendingAction, setPendingAction] =
    useState<PendingSecurityAction>(null);

  const run = useCallback(
    async (
      action: () => Promise<unknown>,
      pending: Exclude<PendingSecurityAction, null>,
      successMessage: string,
    ) => {
      setPendingAction(pending);
      try {
        await action();
        toast.success(successMessage);
        await router.invalidate();
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "The security action could not be completed.",
        );
        return false;
      } finally {
        setPendingAction(null);
      }
    },
    [router],
  );

  const acknowledge = useCallback(
    (findingId: string) =>
      run(
        () =>
          manageSecurityFinding({
            data: {
              findingId,
              action: "acknowledge",
              assigneeId: null,
              resolution: null,
            },
          }),
        { type: "finding", id: findingId },
        "Finding acknowledged.",
      ),
    [run],
  );

  const assign = useCallback(
    (findingId: string, assigneeId: string) =>
      run(
        () =>
          manageSecurityFinding({
            data: {
              findingId,
              action: "assign",
              assigneeId,
              resolution: null,
            },
          }),
        { type: "finding", id: findingId },
        "Finding assigned.",
      ),
    [run],
  );

  const resolve = useCallback(
    (findingId: string, resolution: string) =>
      run(
        () =>
          manageSecurityFinding({
            data: {
              findingId,
              action: "resolve",
              assigneeId: null,
              resolution,
            },
          }),
        { type: "finding", id: findingId },
        "Finding resolved.",
      ),
    [run],
  );

  const reviewControl = useCallback(
    (controlKey: string) =>
      run(
        () => reviewSecurityControl({ data: { controlKey } }),
        { type: "control", id: controlKey },
        "Security control review recorded.",
      ),
    [run],
  );

  return { pendingAction, acknowledge, assign, resolve, reviewControl };
}
