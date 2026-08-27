import { createFileRoute } from "@tanstack/react-router";
import { DocumentsStep } from "~/features/apply/components/DocumentsStep";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/_authed/apply/$serviceCode/documents")({
  component: RouteComponent,
});

function RouteComponent() {
  const { serviceCode } = Route.useParams();
  const { requirements, services } = ApplyLayoutRoute.useLoaderData();

  return (
    <DocumentsStep
      serviceCode={serviceCode}
      requirements={requirements}
      services={services}
    />
  );
}
