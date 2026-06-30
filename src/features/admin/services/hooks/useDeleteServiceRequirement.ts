import { useMutation } from "~/hooks/useMutation";
import { deleteServiceRequirement } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

export function useDeleteServiceRequirement() {
  const router = useRouter();

  return useMutation({
    fn: deleteServiceRequirement,
    onSuccess: async () => {
      toast.success("Requirement removed successfully.");
      await router.invalidate();
    },
  });
}
