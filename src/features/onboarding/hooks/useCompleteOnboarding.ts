import { useRouter } from "@tanstack/react-router";
import { useMutation } from "~/hooks/useMutation";
import { clearCurrentUser } from "~/features/auth/current-user";
import { completeOnboardingFn } from "../onboarding.mutations";

export function useCompleteOnboarding() {
  const router = useRouter();

  return useMutation({
    fn: completeOnboardingFn,
    onSuccess: async (ctx) => {
      // OnboardingPage shows a refused save inline.
      if (ctx.data?.error) return;

      // The sidebar/header read the display name straight off the cached
      // identity, so it has to go before the redirect reads fresh data.
      clearCurrentUser();
      // Replaced, so Back doesn't return to a page that only redirects away.
      await router.navigate({ to: "/dashboard", replace: true });
    },
  });
}
