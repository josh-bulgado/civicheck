import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "~/features/auth/components/Login";

type LoginSearch = {
  redirect?: string;
};

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: (search.redirect as string) || undefined,
  }),
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  return <LoginForm redirect={redirect} />;
}
