import { useRouter } from "@tanstack/react-router";

import { useMutation } from "~/hooks/useMutation";
import { hintCurrentUser } from "../current-user";
import { loginWithEmailFn } from "../auth.mutations";
import { startFreshSession } from "../start-fresh-session";

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
    },
  });
}
