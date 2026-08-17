import { useMutation } from "~/hooks/useMutation";
import { deleteServiceRequirement } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { invalidateServiceCache } from "~/features/services/services.cache";
import { toast } from "sonner";

export function useDeleteServiceRequirement() {
  const router = useRouter();

  return useMutation({
    fn: deleteServiceRequirement,
    onSuccess: async () => {
      toast.success("Requirement removed successfully.");
      // Service definitions and checklists are cached client-side; drop the
      // cached copies so every reader sees this edit right away.
      invalidateServiceCache();
      await router.invalidate();
    },
  });
}
