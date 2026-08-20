import { createFileRoute, useRouter } from "@tanstack/react-router";
import { getServiceDetail } from "~/features/services/services.queries";
import ServiceApplicationPage from "~/features/services/pages/ServiceApplicationPage";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";

export const Route = createFileRoute("/_authed/(service)/service/$serviceCode")({
  loader: ({ params }) => getServiceDetail({ data: params.serviceCode }),
  // Admin edits call `router.invalidate()`, so this only ever serves a
  // checklist the applicant already loaded in this session — realtime below
  // covers an edit landing while this exact page is already open.
  staleTime: 5 * 60_000,
  component: ServiceDetailRoute,
});

function ServiceDetailRoute() {
  const detail = Route.useLoaderData();
  const { serviceCode } = Route.useParams();
  const router = useRouter();
  useRealtimeRefresh({
    tables: ["services_registry", "service_requirements_metadata"],
  });

  return (
    <ServiceApplicationPage
      {...detail}
      serviceCode={serviceCode}
      onSubmitted={() => {
        router.invalidate();
        router.navigate({ to: "/my-requests" });
      }}
    />
  );
}
