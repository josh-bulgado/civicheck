import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMutation } from "~/hooks/useMutation";
import {
  removeStaffMember,
  updateStaffAccess,
} from "../staff.mutations";
import type {
  StaffActionResult,
  UpdateStaffAccessInput,
} from "../staff.types";

type StaffIdVariables = {
  data: { staffId: string };
};

type UpdateStaffAccessVariables = {
  data: UpdateStaffAccessInput;
};

export function useUpdateStaffAccess() {
  const router = useRouter();

  return useMutation<UpdateStaffAccessVariables, StaffActionResult>({
    fn: updateStaffAccess,
    onSuccess: async ({ data }) => {
      if (data.error) {
        toast.error("Unable to update staff access", {
          description: data.message,
        });
        return;
      }

      toast.success(data.message);
      await router.invalidate();
    },
  });
}

export function useRemoveStaffMember() {
  const router = useRouter();

  return useMutation<StaffIdVariables, StaffActionResult>({
    fn: removeStaffMember,
    onSuccess: async ({ data }) => {
      if (data.error) {
        toast.error("Unable to remove staff member", {
          description: data.message,
        });
        return;
      }

      toast.success(data.message);
      await router.invalidate();
    },
  });
}
