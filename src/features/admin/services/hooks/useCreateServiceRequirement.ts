import { useMutation } from "~/hooks/useMutation";
import { createServiceRequirement } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { invalidateServiceCache } from "~/features/services/services.cache";
import { toast } from "sonner";

export function useCreateServiceRequirement() {
  const router = useRouter();

  return useMutation({
    fn: createServiceRequirement,
    onSuccess: async () => {
      toast.success("Requirement added successfully.");
      // Service definitions and checklists are cached client-side; drop the
      // cached copies so every reader sees this edit right away.
      invalidateServiceCache();
      await router.invalidate();
    },
  });
}
