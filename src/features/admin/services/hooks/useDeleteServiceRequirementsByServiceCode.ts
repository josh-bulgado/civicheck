import { useMutation } from "~/hooks/useMutation";
import { deleteServiceRequirementsByServiceCode } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { invalidateServiceCache } from "~/features/services/services.cache";
import { toast } from "sonner";

export function useDeleteServiceRequirementsByServiceCode() {
  const router = useRouter();

  return useMutation({
    fn: deleteServiceRequirementsByServiceCode,
    onSuccess: async () => {
      toast.success("All requirements removed successfully.");
      // Service definitions and checklists are cached client-side; drop the
      // cached copies so every reader sees this edit right away.
      invalidateServiceCache();
      await router.invalidate();
    },
  });
}
