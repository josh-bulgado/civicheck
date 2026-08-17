import { useMutation } from "~/hooks/useMutation";
import { deleteService } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { invalidateServiceCache } from "~/features/services/services.cache";
import { toast } from "sonner";

export function useDeleteService() {
  const router = useRouter();

  return useMutation({
    fn: deleteService,
    onSuccess: async () => {
      toast.success("Service deleted successfully.");
      // Service definitions and checklists are cached client-side; drop the
      // cached copies so every reader sees this edit right away.
      invalidateServiceCache();
      await router.invalidate();
    },
  });
}
