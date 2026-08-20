import { createFileRoute } from "@tanstack/react-router";
import TrackPage from "~/features/track/pages/TrackPage";

type TrackSearch = { ref?: string };

export const Route = createFileRoute("/track")({
  component: TrackRoute,
  validateSearch: (search: Record<string, unknown>): TrackSearch => ({
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
});

function TrackRoute() {
  const { ref } = Route.useSearch();
  return <TrackPage initialTrackingNumber={ref} />;
}
