import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";
import { FileText, Clock, CircleDollarSign, ArrowRight } from "lucide-react";

// Fetch services from services_registry
const getServices = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("services_registry")
    .select("service_code, name, classification, fee, processing_time")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data || [];
});

export const Route = createFileRoute("/_authed/services")({
  loader: () => getServices(),
  component: ServicesPage,
});

function ServicesPage() {
  const services = Route.useLoaderData();

  const getClassificationBadge = (classification: string | null) => {
    switch (classification) {
      case "simple":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
            Simple
          </span>
        );
      case "complex":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/10">
            Complex
          </span>
        );
      case "highly_technical":
        return (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/10">
            Highly Technical
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Browse Document Services
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Select a civil registry service below to view its official requirement checklist.
          You can prepare your documents, fill out the application details, and submit your request intent online.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <div
            key={service.service_code}
            className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow group duration-200"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#1a4480]/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#1a4480]" />
                </div>
                {getClassificationBadge(service.classification)}
              </div>

              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900 line-clamp-2 min-h-[3rem] group-hover:text-[#1a4480] transition-colors">
                  {service.name}
                </h3>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>Processing: <strong>{service.processing_time}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    Service Fee:{" "}
                    <strong>
                      {Number(service.fee) === 0 ? "Free" : `₱${Number(service.fee).toFixed(2)}`}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-5">
              <Link
                to="/checklist/$serviceCode"
                params={{ serviceCode: service.service_code }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-[#1a4480] hover:text-white transition-colors group-hover:bg-[#1a4480] group-hover:text-white"
              >
                View Requirements
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
