import { simplePageTransition } from "~/components/motion/simple-page-transition";
import { createFileRoute } from "@tanstack/react-router";
import SiteHeader from "~/features/landing/components/SiteHeader";
import landingCss from "~/features/landing/landing.css?url";

import { getFeaturedChecklists } from "~/features/landing/landing.queries";
import LandingPage from "~/features/landing/LandingPage";

export const Route = createFileRoute("/")({
  ...simplePageTransition,
  loader: () => getFeaturedChecklists(),
  staleTime: 5 * 60_000,
  head: () => ({
    links: [{ rel: "stylesheet", href: landingCss }],
  }),
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
