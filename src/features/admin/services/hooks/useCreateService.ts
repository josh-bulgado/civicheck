import { useMutation } from "~/hooks/useMutation";
import { createService } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { invalidateServiceCache } from "~/features/services/services.cache";
import { toast } from "sonner";

export function useCreateService() {
  const router = useRouter();

  return useMutation({
    fn: createService,
    onSuccess: async (ctx) => {
      toast.success("Service created successfully.");
      // Service definitions and checklists are cached client-side; drop the
      // cached copies so every reader sees this edit right away.
      invalidateServiceCache();
      await router.invalidate();
    },
  });
}
