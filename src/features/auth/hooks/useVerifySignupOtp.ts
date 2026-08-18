import { useRouter } from "@tanstack/react-router";

import { useMutation } from "~/hooks/useMutation";
import { verifySignupOtpFn } from "../auth.mutations";
import { clearCurrentUser } from "../current-user";
import { toast } from "sonner";

export function useVerifySignupOtp() {
  const router = useRouter();

  return useMutation({
    fn: verifySignupOtpFn,
    onSuccess: async (ctx) => {
      if (ctx.data?.error) {
        toast.error("Verification failed", { description: ctx.data.message });
        return;
      }

      clearCurrentUser();
      await router.invalidate();
      await router.navigate({ to: "/dashboard" });
    },
  });
}
