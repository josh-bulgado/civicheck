import { toast } from "sonner";
import { useMutation } from "~/hooks/useMutation";
import { loginWithOAuthFn } from "../auth.mutations";

type OAuthProvider = "google" | "apple";

export function useOAuthLogin() {
  return useMutation<{ provider: OAuthProvider }, any>({
    fn: async ({ provider }) => loginWithOAuthFn({ data: { provider } }),
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
}
