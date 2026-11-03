import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "~/features/auth/components/LoginForm";
import loginCss from "~/features/auth/login.css?url";

type LoginSearch = {
  redirect?: string;
  error?: string;
};

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    links: [{ rel: "stylesheet", href: loginCss }],
  }),
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: (search.redirect as string) || undefined,
    error: (search.error as string) || undefined,
  }),
});

function LoginPage() {
  const { redirect, error } = Route.useSearch();
  return <LoginForm redirect={redirect} error={error} />;
}
