import { useRouter } from "@tanstack/react-router";

import { useMutation } from "~/hooks/useMutation";
import { hintCurrentUser } from "../current-user";
import { verifySignupOtpFn } from "../auth.mutations";
import { startFreshSession } from "../start-fresh-session";

export function useVerifySignupOtp() {
  const router = useRouter();

  return useMutation({
    fn: verifySignupOtpFn,
    onSuccess: async (ctx) => {
      if (ctx.data?.error) {
        // Code entry owns the inline error so a failed automatic check has
        // one clear place to recover, without a duplicate toast.
        return;
      }

      startFreshSession(router);
      // Only applicants sign up here, and a new account has no requests yet.
      hintCurrentUser({ id: null, role: "applicant" });
      await router.invalidate();
      await router.navigate({ to: "/dashboard" });
    },
  });
}
