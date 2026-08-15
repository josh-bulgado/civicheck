import { createFileRoute } from "@tanstack/react-router";
import { FileCheck2, Files, ShieldCheck } from "lucide-react";
import ServiceCard from "~/features/services/components/ServiceCard";
import { getServices } from "~/features/services/services.queries";

export const Route = createFileRoute("/_authed/(service)/services")({
  loader: () => getServices(),
  component: ServicesPage,
});

function ServicesPage() {
  const services = Route.useLoaderData();

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero">
        <div className="relative z-10 grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white/90">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Official CCRO services
            </div>
            <h1 className="max-w-3xl text-3xl font-extrabold tracking-[-0.035em] text-white sm:text-4xl">
              Browse Document Services
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              Review the official checklist, prepare your documents, and send
              your request intent to the City Civil Registrar Office.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[21rem]">
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <Files className="mb-3 size-5 text-brand-gold" aria-hidden="true" />
              <p className="text-2xl font-extrabold text-white">{services.length}</p>
              <p className="mt-0.5 text-xs text-white/65">Services available</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <FileCheck2 className="mb-3 size-5 text-brand-gold" aria-hidden="true" />
              <p className="text-sm font-bold text-white">Prepare online</p>
              <p className="mt-1 text-xs leading-5 text-white/65">Check requirements first</p>
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="services-list-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">
              Service directory
            </p>
            <h2 id="services-list-heading" className="mt-1 text-xl font-bold tracking-tight text-foreground">
              Select a document service
            </h2>
          </div>
          <p className="hidden text-sm text-muted-foreground sm:block">
            {services.length} official entries
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.service_code} {...service} />
        ))}
        </div>
      </section>
    </div>
  );
}
