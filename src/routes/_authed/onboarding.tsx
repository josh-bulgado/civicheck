import { createFileRoute, redirect } from "@tanstack/react-router";
import { OnboardingPage } from "~/features/onboarding/components/OnboardingPage";

// Sits directly under `_authed`, not `_dashboard` — this is a one-off gate
// before the dashboard shell, not a page within it.
export const Route = createFileRoute("/_authed/onboarding")({
  beforeLoad: ({ context }) => {
    const hasName =
      context.user?.firstName.trim() && context.user?.lastName.trim();
    if (hasName) throw redirect({ to: "/dashboard" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  return <OnboardingPage user={user!} />;
}
