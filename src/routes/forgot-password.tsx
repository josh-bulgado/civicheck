import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useMutation } from "~/hooks/useMutation";
import { getSupabaseServerClient } from "~/utils/supabase";
import { ForgotPasswordForm } from "~/components/auth/forgot-password-form";

const forgotPasswordFn = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${process.env.SUPABASE_URL ? "http://localhost:3000" : "http://localhost:3000"}/reset-password`,
    });

    if (error) {
      return {
        error: true,
        message: error.message,
      };
    }

    return {
      error: false,
      message: "Password reset link sent.",
    };
  });

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const forgotMutation = useMutation<
    { data: { email: string } },
    { error: boolean; message: string }
  >({
    fn: useServerFn(forgotPasswordFn),
  });

  return (
    <ForgotPasswordForm
      onSubmit={(email) => {
        forgotMutation.mutate({
          data: { email },
        });
      }}
      status={forgotMutation.status}
      serverError={
        forgotMutation.data?.error ? forgotMutation.data.message : null
      }
    />
  );
}
