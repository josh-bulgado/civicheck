import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useMutation } from "~/hooks/useMutation";
import { getSupabaseServerClient } from "~/utils/supabase";
import { ResetPasswordForm } from "~/components/auth/reset-password-form";

const resetPasswordFn = createServerFn({ method: "POST" })
  .validator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      return {
        error: true,
        message: error.message,
      };
    }

    return {
      error: false,
      message: "Password updated successfully.",
    };
  });

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const resetMutation = useMutation<
    { data: { password: string } },
    { error: boolean; message: string }
  >({
    fn: useServerFn(resetPasswordFn),
  });

  return (
    <ResetPasswordForm
      onSubmit={(password) => {
        resetMutation.mutate({
          data: { password },
        });
      }}
      status={resetMutation.status}
      serverError={
        resetMutation.data?.error ? resetMutation.data.message : null
      }
    />
  );
}
