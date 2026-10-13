import { createFileRoute } from "@tanstack/react-router";
import { DetailsStep } from "~/features/apply/components/DetailsStep";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/_authed/apply/$serviceCode/details")({
  component: RouteComponent,
});

function RouteComponent() {
  const { routeCode, requirements, services } = ApplyLayoutRoute.useLoaderData();

  return (
    <DetailsStep
      serviceCode={routeCode}
      requirements={requirements}
      services={services}
    />
  );
}
