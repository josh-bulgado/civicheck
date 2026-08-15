import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMutation } from "~/hooks/useMutation";
import { inviteStaff } from "../staff.mutations";

export function useInviteStaff() {
  const router = useRouter();
  return useMutation({
    fn: inviteStaff,
    onSuccess: async (ctx) => {
      if (ctx.data && !ctx.data.error) {
        toast.success(ctx.data.message);
        await router.invalidate();
        return;
      }
      toast.error("Unable to invite staff", {
        description: ctx.data?.message || "Something went wrong.",
      });
    },
  });
}
