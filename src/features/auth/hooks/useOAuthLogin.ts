import { useEffect } from "react";
import { toast } from "sonner";
import { useMutation } from "~/hooks/useMutation";
import { loginWithOAuthFn } from "../auth.mutations";

type OAuthProvider = "google" | "apple";

export function useOAuthLogin() {
  const mutation = useMutation<
    { provider: OAuthProvider; keepSignedIn?: boolean },
    any
  >({
    fn: async ({ provider, keepSignedIn }) =>
      loginWithOAuthFn({ data: { provider, keepSignedIn } }),
    onSuccess: async (ctx) => {
      if (ctx.data?.error) {
        toast.error("Unable to sign in", {
          description: ctx.data.message || "OAuth sign in failed.",
        });

        return;
      }

      // Redirect to the OAuth provider's URL
      if (ctx.data?.url) {
        window.location.href = ctx.data.url;
      }
    },
  });

  // Assigning `window.location` returns immediately, so the mutation reads as
  // `success` the instant the browser starts leaving. Callers should key their
  // busy state off this instead of `status`, or the button re-enables and looks
  // like nothing happened during the hand-off.
  const redirecting =
    mutation.status === "pending" ||
    (mutation.status === "success" && !!mutation.data?.url);

  // Coming back from the provider with the Back button can restore the page
  // from the bfcache with the busy state frozen on. Reload to a clean form.
  useEffect(() => {
    if (!redirecting) return;
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [redirecting]);

  return { ...mutation, redirecting };
}
