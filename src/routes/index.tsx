import { createFileRoute } from "@tanstack/react-router";

import { getFeaturedChecklist } from "~/features/landing/landing.queries";
import LandingPage from "~/features/landing/LandingPage";

export const Route = createFileRoute("/")({
  loader: () => getFeaturedChecklist(),
  staleTime: 5 * 60_000,
  component: Home,
});

function Home() {
  const featuredChecklist = Route.useLoaderData();

  return <LandingPage featuredChecklist={featuredChecklist} />;
}
