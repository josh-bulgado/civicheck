import { createFileRoute } from "@tanstack/react-router";
import ServicesPage from "~/features/services/ServicesPage";

type RequirementsSearch = {
  code?: string;
};

export const Route = createFileRoute("/requirements")({
  validateSearch: (search: Record<string, unknown>): RequirementsSearch => ({
    code: (search.code as string) || undefined,
  }),
  component: RequirementsPageRoute,
});

function RequirementsPageRoute() {
  const { code } = Route.useSearch();
  return <ServicesPage selectedCode={code} />;
}
