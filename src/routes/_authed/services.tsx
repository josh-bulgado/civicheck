import { createFileRoute, Link } from "@tanstack/react-router";
import ServiceCard from "~/features/services/components/ServiceCard";
import { getServices } from "~/features/services/services.queries";

export const Route = createFileRoute("/_authed/services")({
  loader: () => getServices(),
  component: ServicesPage,
});

function ServicesPage() {
  const services = Route.useLoaderData();

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Browse Document Services
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Select a civil registry service below to view its official requirement
          checklist. You can prepare your documents, fill out the application
          details, and submit your request intent online.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.service_code} {...service} />
        ))}
      </div>
    </div>
  );
}
