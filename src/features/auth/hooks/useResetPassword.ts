import { useMutation } from "~/hooks/useMutation";
import { resetPasswordFn } from "../auth.mutations";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    fn: resetPasswordFn,
    onSuccess: async (ctx) => {
      if (ctx.data?.error) {
        toast.error("Update failed", { description: ctx.data.message });
        return;
      }

      toast.success("Password updated successfully.");
      await router.invalidate();
      await router.navigate({ to: "/login" });
    },
  });
}
