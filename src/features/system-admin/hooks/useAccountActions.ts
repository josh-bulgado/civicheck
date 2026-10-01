import { useCallback, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  reactivateAccount,
  replaceCcroAdmin,
  resendAccountVerification,
  revokeAccountSessions,
  sendAccountPasswordReset,
  suspendAccount,
  updateAccountDetails,
} from "../system-admin.functions";
import type { AccountDetailsInput } from "../system-admin.types";

type OutgoingRole = "staff" | "supervisor" | "cashier";
type ReplaceAdministratorInput = {
  candidateId: string;
  outgoingRole: OutgoingRole | null;
  outgoingDepartmentId: string | null;
};

export type AccountPendingAction =
  | { type: "suspend"; accountId: string }
  | { type: "reactivate"; accountId: string }
  | { type: "edit-details"; accountId: string }
  | { type: "password-reset"; accountId: string }
  | { type: "revoke-sessions"; accountId: string }
  | { type: "resend-verification"; accountId: string }
  | { type: "replace-admin" }
  | null;

export function useAccountActions() {
  const router = useRouter();
  const [pendingAction, setPendingAction] =
    useState<AccountPendingAction>(null);

  const run = useCallback(
    async (
      action: () => Promise<unknown>,
      pending: Exclude<AccountPendingAction, null>,
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
            : "The action could not be completed.",
        );
        return false;
      } finally {
        setPendingAction(null);
      }
    },
    [router],
  );

  const suspend = useCallback(
    (accountId: string, reason: string) =>
      run(
        () => suspendAccount({ data: { targetId: accountId, reason } }),
        { type: "suspend", accountId },
        "Account suspended.",
      ),
    [run],
  );

  const reactivate = useCallback(
    (accountId: string) =>
      run(
        () => reactivateAccount({ data: { targetId: accountId } }),
        { type: "reactivate", accountId },
        "Account reactivated.",
      ),
    [run],
  );

  const updateDetails = useCallback(
    (values: AccountDetailsInput) =>
      run(
        () => updateAccountDetails({ data: values }),
        { type: "edit-details", accountId: values.targetId },
        "Account details updated.",
      ),
    [run],
  );

  const sendPasswordReset = useCallback(
    (accountId: string) =>
      run(
        () => sendAccountPasswordReset({ data: { targetId: accountId } }),
        { type: "password-reset", accountId },
        "Password reset link sent.",
      ),
    [run],
  );

  const revokeSessions = useCallback(
    (accountId: string) =>
      run(
        () => revokeAccountSessions({ data: { targetId: accountId } }),
        { type: "revoke-sessions", accountId },
        "Signed out of all sessions.",
      ),
    [run],
  );

  const resendVerification = useCallback(
    (accountId: string, email: string) =>
      run(
        () => resendAccountVerification({ data: { targetId: accountId, email } }),
        { type: "resend-verification", accountId },
        "Verification email sent.",
      ),
    [run],
  );

  const replaceAdministrator = useCallback(
    ({ candidateId, outgoingRole, outgoingDepartmentId }: ReplaceAdministratorInput) =>
      run(
        () =>
          replaceCcroAdmin({
            data: { candidateId, outgoingRole, outgoingDepartmentId },
          }),
        { type: "replace-admin" },
        outgoingRole
          ? "CCRO Administrator replaced."
          : "CCRO Administrator appointed.",
      ),
    [run],
  );

  return {
    pendingAction,
    suspend,
    reactivate,
    updateDetails,
    sendPasswordReset,
    revokeSessions,
    resendVerification,
    replaceAdministrator,
  };
}
