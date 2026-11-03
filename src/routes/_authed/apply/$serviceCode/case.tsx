import { createFileRoute } from "@tanstack/react-router";
import { CaseStep } from "~/features/apply/components/CaseStep";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/_authed/apply/$serviceCode/case")({
  component: RouteComponent,
});

function RouteComponent() {
  const { routeCode, isGroup, requirements, services } =
    ApplyLayoutRoute.useLoaderData();

  return (
    <CaseStep
      serviceCode={routeCode}
      isGroup={isGroup}
      requirements={requirements}
      services={services}
    />
  );
}
