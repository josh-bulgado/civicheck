import { useMutation } from "~/hooks/useMutation";
import { signupFn } from "../auth.mutations";

export function useSignUp() {
  return useMutation({
    fn: signupFn,
  });
}
