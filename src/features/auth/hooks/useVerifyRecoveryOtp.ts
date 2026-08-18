import { useRouter } from "@tanstack/react-router";

import { useMutation } from "~/hooks/useMutation";
import { verifyRecoveryOtpFn } from "../auth.mutations";
import { toast } from "sonner";

export function useVerifyRecoveryOtp() {
  const router = useRouter();

  return useMutation({
    fn: verifyRecoveryOtpFn,
    onSuccess: async (ctx) => {
      if (ctx.data?.error) {
        toast.error("Verification failed", { description: ctx.data.message });
        return;
      }

      await router.navigate({ to: "/reset-password" });
    },
  });
}
