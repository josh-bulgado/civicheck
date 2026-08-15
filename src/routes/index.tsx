import { createFileRoute } from "@tanstack/react-router";

import { getFeaturedChecklist } from "~/features/landing/landing.queries";
import LandingPage from "~/features/landing/LandingPage";

export const Route = createFileRoute("/")({
  loader: () => getFeaturedChecklist(),
  component: Home,
});

function Home() {
  const featuredChecklist = Route.useLoaderData();

  return <LandingPage featuredChecklist={featuredChecklist} />;
}
