import { useMutation } from "~/hooks/useMutation";
import { saveServiceConfiguration } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { invalidateServiceCache } from "~/features/services/services.cache";

export function useSaveServiceConfiguration() {
  const router = useRouter();

  return useMutation({
    fn: saveServiceConfiguration,
    onSuccess: async () => {
      // Service definitions and checklists are cached client-side; drop the
      // cached copies so every reader sees this edit right away.
      invalidateServiceCache();
      await router.invalidate();
    },
  });
}
