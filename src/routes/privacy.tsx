import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "~/features/legal/LegalPage";
import landingCss from "~/features/landing/landing.css?url";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    links: [{ rel: "stylesheet", href: landingCss }],
  }),
  component: PrivacyRoute,
});

function PrivacyRoute() {
  return <LegalPage documentKey="privacy" />;
}
