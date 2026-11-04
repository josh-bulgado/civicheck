import { useEffect } from "react";
import { useMutation } from "~/hooks/useMutation";
import { loginWithOAuthFn } from "../auth.mutations";

type OAuthProvider = "google" | "apple";

/** What `loginWithOAuthFn` hands back: an error to show, or the URL to leave for. */
type OAuthResult = { error?: boolean; message?: string; url?: string | null; lockedUntil?: number; captchaRequired?: boolean; captchaError?: boolean };

export function useOAuthLogin() {
  const mutation = useMutation<
    { provider: OAuthProvider; intent?: "login" | "signup"; keepSignedIn?: boolean; email?: string; captchaToken?: string },
    OAuthResult
  >({
    fn: async ({ provider, intent = "signup", keepSignedIn, email, captchaToken }) =>
      loginWithOAuthFn({ data: { provider, intent, keepSignedIn,
        ...(intent === "signup" ? { email, captchaToken } : {}),
      } }),
    onSuccess: async (ctx) => {
      if (ctx.data?.error) {
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
