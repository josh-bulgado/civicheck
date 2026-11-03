import { useCallback } from "react";
import { useActionRunner } from "~/hooks/useActionRunner";
import {
  manageSecurityFinding,
  reviewSecurityControl,
} from "../security-center.functions";

type PendingSecurityAction =
  | { type: "finding"; id: string }
  | { type: "control"; id: string }
  | null;

export function useSecurityCenterActions() {
  const { pending: pendingAction, run } = useActionRunner<
    Exclude<PendingSecurityAction, null>
  >("The security action could not be completed.");

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
