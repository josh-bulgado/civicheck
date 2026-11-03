import { useRouter } from "@tanstack/react-router";

import { useMutation } from "~/hooks/useMutation";
import { hintCurrentUser } from "../current-user";
import { loginWithEmailFn } from "../auth.mutations";
import { startFreshSession } from "../start-fresh-session";
import { toast } from "sonner";

export function useLogin(redirectTo?: string) {
  const router = useRouter();

  return useMutation({
    fn: loginWithEmailFn,
    onSuccess: async (ctx) => {
      if (!ctx.data?.error) {
        startFreshSession(router);
        // After the reset above, which forgets it.
        if (ctx.data?.role) {
          hintCurrentUser({ id: ctx.data.userId, role: ctx.data.role });
        }
        await router.invalidate();
        await router.navigate({ to: redirectTo || "/dashboard" });
        return;
      }

      // Handled inline by LoginForm, which sends the applicant straight to a
      // fresh verification code instead of this generic failure toast.
      if (/email not confirmed/i.test(ctx.data.message ?? "")) {
        return;
      }

      toast.error("Wrong Email and Password");
    },
  });
}
