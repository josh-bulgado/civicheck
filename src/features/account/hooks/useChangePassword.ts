import { toast } from "sonner";
import { useMutation } from "~/hooks/useMutation";
import { changeMyPasswordFn } from "../account.mutations";

export function useChangePassword() {
  return useMutation({
    fn: changeMyPasswordFn,
    onSuccess: (ctx) => {
      if (ctx.data?.error) {
        toast.error("Unable to update password", {
          description: ctx.data.message,
        });
        return;
      }

      toast.success(ctx.data.message);
    },
  });
}
