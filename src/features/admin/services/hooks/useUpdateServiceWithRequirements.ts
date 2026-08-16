import { useMutation } from "~/hooks/useMutation";
import { updateServiceWithRequirements } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

export function useUpdateServiceWithRequirements() {
  const router = useRouter();

  return useMutation({
    fn: updateServiceWithRequirements,
    onSuccess: async () => {
      toast.success("Service updated successfully.");
      await router.invalidate();
    },
  });
}
