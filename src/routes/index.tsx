import { LandingPageSkeleton } from "~/features/landing/components/LandingPageSkeleton";
import { createFileRoute } from "@tanstack/react-router";
import SiteHeader from "~/features/landing/components/SiteHeader";

import { getFeaturedChecklists } from "~/features/landing/landing.queries";
import LandingPage from "~/features/landing/LandingPage";

export const Route = createFileRoute("/")({
  loader: () => getFeaturedChecklists(),
  staleTime: 5 * 60_000,
  pendingComponent: LandingPageSkeleton,
  component: Home,
});

function Home() {
  const featuredChecklists = Route.useLoaderData();

  return (
    <div>
      <SiteHeader />
      <LandingPage featuredChecklists={featuredChecklists} />
    </div>
  );
}
