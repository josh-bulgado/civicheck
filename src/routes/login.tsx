import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "~/features/auth/components/LoginForm";
import loginCss from "~/features/auth/login.css?url";

type LoginSearch = {
  redirect?: string;
  error?: string;
  lockedUntil?: number;
};

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    links: [{ rel: "stylesheet", href: loginCss }],
  }),
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: (search.redirect as string) || undefined,
    error: (search.error as string) || undefined,
    lockedUntil: Number.isFinite(Number(search.lockedUntil)) && Number(search.lockedUntil) > 0
      ? Number(search.lockedUntil) : undefined,
  }),
});

function LoginPage() {
  const { redirect, error, lockedUntil } = Route.useSearch();
  return <LoginForm redirect={redirect} error={error} lockedUntil={lockedUntil} />;
}
