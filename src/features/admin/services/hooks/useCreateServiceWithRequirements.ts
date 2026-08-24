import { useMutation } from "~/hooks/useMutation";
import { createServiceWithRequirements } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { invalidateServiceCache } from "~/features/services/services.cache";

export function useCreateServiceWithRequirements() {
  const router = useRouter();

  return useMutation({
    fn: createServiceWithRequirements,
    onSuccess: async () => {
      // Service definitions and checklists are cached client-side; drop the
      // cached copies so every reader sees this edit right away.
      invalidateServiceCache();
      await router.invalidate();
    },
  });
}
