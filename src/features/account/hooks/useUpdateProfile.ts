import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMutation } from "~/hooks/useMutation";
import { updateMyProfileFn } from "../account.mutations";

export function useUpdateProfile() {
  const router = useRouter();

  return useMutation({
    fn: updateMyProfileFn,
    onSuccess: async (ctx) => {
      if (ctx.data?.error) {
        toast.error("Unable to save profile", {
          description: ctx.data.message,
        });
        return;
      }

      toast.success(ctx.data.message);
      await router.invalidate();
    },
  });
}
