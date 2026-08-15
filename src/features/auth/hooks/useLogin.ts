import { useRouter } from "@tanstack/react-router";

import { useMutation } from "~/hooks/useMutation";
import { loginWithEmailFn } from "../auth.mutations";
import { toast } from "sonner";

export function useLogin(redirectTo?: string) {
  const router = useRouter();

  return useMutation({
    fn: loginWithEmailFn,
    onSuccess: async (ctx) => {
      if (!ctx.data?.error) {
        await router.invalidate();
        await router.navigate({ to: redirectTo || "/dashboard" });
        return;
      }

      toast.error("Unable to sign in", {
        description: "Invalid email or password.",
      });
    },
  });
}
