import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMutation } from "~/hooks/useMutation";
import {
  deactivateStaffMember,
  reactivateStaffMember,
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

export function useDeactivateStaffMember() {
  const router = useRouter();

  return useMutation<StaffIdVariables, StaffActionResult>({
    fn: deactivateStaffMember,
    onSuccess: async ({ data }) => {
      if (data.error) {
        toast.error("Unable to deactivate staff member", {
          description: data.message,
        });
        return;
      }

      toast.success(data.message);
      await router.invalidate();
    },
  });
}

export function useReactivateStaffMember() {
  const router = useRouter();
  return useMutation<StaffIdVariables, StaffActionResult>({
    fn: reactivateStaffMember,
    onSuccess: async ({ data }) => {
      if (data.error) {
        toast.error("Unable to reactivate staff member", { description: data.message });
        return;
      }
      toast.success(data.message);
      await router.invalidate();
    },
  });
}
