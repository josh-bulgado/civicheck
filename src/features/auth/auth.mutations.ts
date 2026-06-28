import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";

export const loginWithEmailFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected login server error occurred. Please check your Supabase connection."
        : error.message;
      return {
        error: true,
        message: cleanMessage,
      };
    }
  });

export const loginWithOAuthFn = createServerFn({ method: "POST" })
  .validator((d: { provider: "google" | "apple" }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const devFallback =
      process.env.NODE_ENV === "development" ? "http://localhost:3000" : "";
    const redirectTo = `${process.env.APP_URL || devFallback}/auth/callback`;

    const { error, data: authData } = await supabase.auth.signInWithOAuth({
      provider: data.provider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected OAuth provider error occurred. Please check your Supabase configuration."
        : error.message;
      return { error: true, message: cleanMessage };
    }

    return { url: authData.url };
  });

export const signupFn = createServerFn({ method: "POST" })
  .validator(
    (d: { email: string; password: string; redirectUrl?: string }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
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

    // Redirect to the prev page stored in the "redirect" search param
    return { error: false, redirectUrl: data.redirectUrl || "/" };
  });

export const resetPasswordFn = createServerFn({ method: "POST" })
  .validator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected password reset server error occurred."
        : error.message;
      return {
        error: true,
        message: cleanMessage,
      };
    }

    return {
      error: false,
      message: "Password updated successfully.",
    };
  });

export const forgotPasswordFn = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${process.env.SUPABASE_URL ? "http://localhost:3000" : "http://localhost:3000"}/reset-password`,
    });

    if (error) {
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected forgot password request server error occurred."
        : error.message;
      return {
        error: true,
        message: cleanMessage,
      };
    }

    return {
      error: false,
      message: "Password reset link sent.",
    };
  });
