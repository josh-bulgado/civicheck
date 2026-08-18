import { useRouter } from "@tanstack/react-router";

import { useMutation } from "~/hooks/useMutation";
import { loginWithEmailFn } from "../auth.mutations";
import { clearCurrentUser } from "../current-user";
import { toast } from "sonner";

export function useLogin(redirectTo?: string) {
  const router = useRouter();

  return useMutation({
    fn: loginWithEmailFn,
    onSuccess: async (ctx) => {
      if (!ctx.data?.error) {
        clearCurrentUser();
        await router.invalidate();
        await router.navigate({ to: redirectTo || "/dashboard" });
        return;
      }

      // Handled inline by LoginForm, which sends the applicant straight to a
      // fresh verification code instead of this generic failure toast.
      if (/email not confirmed/i.test(ctx.data.message ?? "")) {
        return;
      }

      toast.error("Unable to sign in", {
        description: "Invalid email or password.",
      });
    },
  });
}
