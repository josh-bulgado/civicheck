import { useMutation } from "~/hooks/useMutation";
import { createService } from "../services.mutations";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

export function useCreateService() {
  const router = useRouter();

  return useMutation({
    fn: createService,
    onSuccess: async (ctx) => {
      toast.success("Service created successfully.");
      await router.invalidate();
    },
  });
}
