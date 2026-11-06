import { createFileRoute } from "@tanstack/react-router";
import TrackPage from "~/features/track/pages/TrackPage";
import landingCss from "~/features/landing/landing.css?url";
import publicPagesCss from "~/styles/public-pages.css?url";

type TrackSearch = { ref?: string };

export const Route = createFileRoute("/track")({
  head: () => ({
    links: [
      { rel: "stylesheet", href: landingCss },
      { rel: "stylesheet", href: publicPagesCss },
    ],
  }),
  component: TrackRoute,
  validateSearch: (search: Record<string, unknown>): TrackSearch => ({
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
});

function TrackRoute() {
  const { ref } = Route.useSearch();
  return <TrackPage initialTrackingNumber={ref} />;
}
