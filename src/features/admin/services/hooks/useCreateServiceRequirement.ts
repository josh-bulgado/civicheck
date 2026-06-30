import { useMutation } from "~/hooks/useMutation";
import { createServiceRequirement } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

export function useCreateServiceRequirement() {
  const router = useRouter();

  return useMutation({
    fn: createServiceRequirement,
    onSuccess: async () => {
      toast.success("Requirement added successfully.");
      await router.invalidate();
    },
  });
}
