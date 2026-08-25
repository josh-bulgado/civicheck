import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMutation } from "~/hooks/useMutation";
import { updateMyProfileFn } from "~/features/account/account.mutations";
import { clearCurrentUser } from "~/features/auth/current-user";

export function useCompleteOnboarding() {
  const router = useRouter();

  return useMutation({
    fn: updateMyProfileFn,
    onSuccess: async (ctx) => {
      if (ctx.data?.error) {
        toast.error("Unable to save your name", {
          description: ctx.data.message,
        });
        return;
      }

      // The sidebar/header read the display name straight off the cached
      // identity, so it has to go before the redirect reads fresh data.
      clearCurrentUser();
      await router.navigate({ to: "/dashboard" });
    },
  });
}
