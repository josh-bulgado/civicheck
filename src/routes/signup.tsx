import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import RegisterForm from "~/features/auth/components/RegisterForm";
import { useMutation } from "~/hooks/useMutation";
import { getSupabaseServerClient } from "~/utils/supabase";

const signupFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
        },
      },
    });

    if (error) {
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected registration error occurred. Please check your SMTP configuration in the Supabase Dashboard."
        : error.message;
      return {
        error: true,
        message: cleanMessage,
      };
    }

    return {
      error: false,
      message:
        "Please check your email to confirm your account before signing in.",
    };
  });

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const signupMutation = useMutation<
    {
      data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
      };
    },
    { error: boolean; message: string }
  >({
    fn: useServerFn(signupFn),
  });

  return (
    <RegisterForm />

    // <RegisterForm
    //   onSubmit={(formData) => {
    //     signupMutation.mutate({
    //       data: formData,
    //     });
    //   }}
    //   status={signupMutation.status}
    //   serverError={signupMutation.data?.error ? signupMutation.data.message : null}
    //   successMessage={
    //     signupMutation.data && !signupMutation.data.error
    //       ? signupMutation.data.message
    //       : null
    //   }
    // />
  );
}
