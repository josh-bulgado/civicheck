import { useMutation } from "~/hooks/useMutation";
import { signupFn } from "../auth.mutations";
import { toast } from "sonner";

export function useSignUp() {
  return useMutation({
    fn: signupFn,
    onSuccess: (ctx) => {
      if (ctx.data?.error) {
        toast.error("Unable to sign up", {
          description: ctx.data.message || "Something went wrong.",
        });
      }
    },
  });
}
