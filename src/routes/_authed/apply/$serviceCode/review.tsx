import { createFileRoute } from "@tanstack/react-router";
import { ReviewStep } from "~/features/apply/components/ReviewStep";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/_authed/apply/$serviceCode/review")({
  component: RouteComponent,
});

function RouteComponent() {
  const { serviceCode } = Route.useParams();
  const { displayName, services, requirements } = ApplyLayoutRoute.useLoaderData();

  return (
    <ReviewStep
      serviceCode={serviceCode}
      displayName={displayName}
      services={services}
      requirements={requirements}
    />
  );
}
