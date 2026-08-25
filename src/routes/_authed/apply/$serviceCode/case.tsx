import { createFileRoute } from "@tanstack/react-router";
import { CaseStep } from "~/features/apply/components/CaseStep";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/_authed/apply/$serviceCode/case")({
  component: RouteComponent,
});

function RouteComponent() {
  const { serviceCode } = Route.useParams();
  const { isGroup, requirements, services } = ApplyLayoutRoute.useLoaderData();

  return (
    <CaseStep
      serviceCode={serviceCode}
      isGroup={isGroup}
      requirements={requirements}
      services={services}
    />
  );
}
