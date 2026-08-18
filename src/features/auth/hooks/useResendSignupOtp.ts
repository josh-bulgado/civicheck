import { useMutation } from "~/hooks/useMutation";
import { resendSignupOtpFn } from "../auth.mutations";
import { toast } from "sonner";

export function useResendSignupOtp() {
  return useMutation({
    fn: resendSignupOtpFn,
    onSuccess: (ctx) => {
      if (ctx.data?.error) {
        toast.error("Could not resend code", {
          description: ctx.data.message,
        });
      }
    },
  });
}
