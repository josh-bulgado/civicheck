import { useMutation } from "~/hooks/useMutation";
import { deleteServiceRequirementsByServiceCode } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

export function useDeleteServiceRequirementsByServiceCode() {
  const router = useRouter();

  return useMutation({
    fn: deleteServiceRequirementsByServiceCode,
    onSuccess: async () => {
      toast.success("All requirements removed successfully.");
      await router.invalidate();
    },
  });
}
