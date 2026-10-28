import { useRouter } from "@tanstack/react-router";

import { useMutation } from "~/hooks/useMutation";
import { hintCurrentUser } from "../current-user";
import { verifySignupOtpFn } from "../auth.mutations";
import { startFreshSession } from "../start-fresh-session";
import { toast } from "sonner";

export function useVerifySignupOtp() {
  const router = useRouter();

  return useMutation({
    fn: verifySignupOtpFn,
    onSuccess: async (ctx) => {
      if (ctx.data?.error) {
        toast.error(ctx.data.message);
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
