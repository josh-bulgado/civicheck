import { useMutation } from "~/hooks/useMutation";
import { updateService } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

export function useUpdateService() {
  const router = useRouter();

  return useMutation({
    fn: updateService,
    onSuccess: async () => {
      toast.success("Service updated successfully.");
      await router.invalidate();
    },
  });
}
