import { createFileRoute } from "@tanstack/react-router";
import ServicesPage from "~/features/services/ServicesPage";
import landingCss from "~/features/landing/landing.css?url";
import publicPagesCss from "~/styles/public-pages.css?url";

type RequirementsSearch = {
  code?: string;
};

export const Route = createFileRoute("/requirements")({
  head: () => ({
    links: [
      { rel: "stylesheet", href: landingCss },
      { rel: "stylesheet", href: publicPagesCss },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): RequirementsSearch => ({
    code: (search.code as string) || undefined,
  }),
  component: RequirementsPageRoute,
});

function RequirementsPageRoute() {
  const { code } = Route.useSearch();
  return <ServicesPage selectedCode={code} />;
}
