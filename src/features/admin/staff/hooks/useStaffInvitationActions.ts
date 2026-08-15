import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMutation } from "~/hooks/useMutation";
import {
  cancelStaffInvitation,
  resendStaffInvitation,
} from "../staff.mutations";

export function useResendStaffInvitation() {
  const router = useRouter();

  return useMutation({
    fn: resendStaffInvitation,
    onSuccess: async ({ data }) => {
      if (data.error) {
        toast.error("Unable to resend invitation", {
          description: data.message,
        });
        return;
      }

      toast.success(data.message);
      await router.invalidate();
    },
  });
}

export function useCancelStaffInvitation() {
  const router = useRouter();

  return useMutation({
    fn: cancelStaffInvitation,
    onSuccess: async ({ data }) => {
      if (data.error) {
        toast.error("Unable to cancel invitation", {
          description: data.message,
        });
        return;
      }

      toast.success(data.message);
      await router.invalidate();
    },
  });
}
