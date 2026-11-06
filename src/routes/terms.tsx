import { createFileRoute } from "@tanstack/react-router";
import LegalPage from "~/features/legal/LegalPage";
import landingCss from "~/features/landing/landing.css?url";

export const Route = createFileRoute("/terms")({
  head: () => ({
    links: [{ rel: "stylesheet", href: landingCss }],
  }),
  component: TermsRoute,
});

function TermsRoute() {
  return <LegalPage documentKey="terms" />;
}
