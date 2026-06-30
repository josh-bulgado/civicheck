import { useMutation } from "~/hooks/useMutation";
import { deleteService } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

export function useDeleteService() {
  const router = useRouter();

  return useMutation({
    fn: deleteService,
    onSuccess: async () => {
      toast.success("Service deleted successfully.");
      await router.invalidate();
    },
  });
}
