import { useMutation } from "~/hooks/useMutation";
import { updateServiceWithRequirements } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { invalidateServiceCache } from "~/features/services/services.cache";

export function useUpdateServiceWithRequirements() {
  const router = useRouter();

  return useMutation({
    fn: updateServiceWithRequirements,
    onSuccess: async () => {
      // Service definitions and checklists are cached client-side; drop the
      // cached copies so every reader sees this edit right away.
      invalidateServiceCache();
      await router.invalidate();
    },
  });
}
