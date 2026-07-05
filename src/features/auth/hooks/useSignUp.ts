import { useRouter } from "@tanstack/react-router";

import { useMutation } from "~/hooks/useMutation";
import { loginWithEmailFn, signupFn } from "../auth.mutations";
import { toast } from "sonner";

export function useSignUp() {
  const router = useRouter();

  return useMutation({
    fn: signupFn,
    onSuccess: async (ctx) => {
      // Check for your custom return object
      if (ctx.data && !ctx.data.error) {
        await router.invalidate();
        if (ctx.data.redirectUrl) {
          // Use the returned URL
          await router.navigate({ to: ctx.data.redirectUrl });
        }
        return;
      }

      toast.error("Unable to sign up", {
        description: ctx.data?.message || "Something went wrong.",
      });
    },
  });
}
