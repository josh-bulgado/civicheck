import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMutation } from "~/hooks/useMutation";
import { acceptStaffInvitationFn } from "../accept-invitation.mutations";
import { clearCurrentUser } from "~/features/auth/current-user";

export function useAcceptInvitation() {
  const router = useRouter();

  return useMutation({
    fn: acceptStaffInvitationFn,
    onSuccess: async ({ data }) => {
      if (data.error) {
        toast.error("Invitation could not be accepted", {
          description: data.message,
        });
        return;
      }

      toast.success(data.message);
      clearCurrentUser();
      await router.invalidate();
      await router.navigate({ to: "/dashboard" });
    },
  });
}
