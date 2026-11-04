import { useMutation } from "~/hooks/useMutation"; // Your custom wrapper
import { forgotPasswordFn } from "../auth.mutations";
import { toast } from "sonner";

export function useForgotPassword() {
  return useMutation({
    fn: forgotPasswordFn,
    onSuccess: (ctx) => {
      if (ctx.data?.error) {
        toast.error("Error", { description: ctx.data.message });
        return;
      }
      toast.success("If an account exists, a reset code will arrive shortly.");
    },
  });
}
