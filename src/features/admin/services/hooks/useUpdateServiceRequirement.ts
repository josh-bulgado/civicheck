import { useMutation } from "~/hooks/useMutation";
import { updateServiceRequirement } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

export function useUpdateServiceRequirement() {
  const router = useRouter();

  return useMutation({
    fn: updateServiceRequirement,
    onSuccess: async () => {
      toast.success("Requirement updated successfully.");
      await router.invalidate();
    },
  });
}
