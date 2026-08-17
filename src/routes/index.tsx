import { createFileRoute } from "@tanstack/react-router";

import { getFeaturedChecklists } from "~/features/landing/landing.queries";
import LandingPage from "~/features/landing/LandingPage";

export const Route = createFileRoute("/")({
  loader: () => getFeaturedChecklists(),
  staleTime: 5 * 60_000,
  component: Home,
});

function Home() {
  const featuredChecklists = Route.useLoaderData();

  return <LandingPage featuredChecklists={featuredChecklists} />;
}
