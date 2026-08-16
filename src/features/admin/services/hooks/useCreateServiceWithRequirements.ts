import { useMutation } from "~/hooks/useMutation";
import { createServiceWithRequirements } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

export function useCreateServiceWithRequirements() {
  const router = useRouter();

  return useMutation({
    fn: createServiceWithRequirements,
    onSuccess: async () => {
      toast.success("Service created successfully.");
      await router.invalidate();
    },
  });
}
