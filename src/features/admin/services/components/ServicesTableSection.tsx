import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Blocks, Plus } from "lucide-react";
import { buttonVariants } from "~/components/ui/button";
import { ServiceDetailSheet } from "~/features/services/components/ServiceDetailSheet";
import { ServicesDataTable } from "./ServicesDataTable";
import type { ServiceDossier } from "./ServicesColumn";
import type { Department } from "~/features/admin/departments.queries";

interface ServicesTableSectionProps {
  services: ServiceDossier[];
  departments: Department[];
}

export function ServicesTableSection({
  services,
  departments,
}: ServicesTableSectionProps) {
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<ServiceDossier | null>(null);

  return (
    <section className="dashboard-panel overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Active Services Database
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select any service row to review its mandatory checklist and
            processing steps.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to="/admin/services/blocks"
            search={{ block: undefined }}
            className={buttonVariants({ variant: "outline" })}
          >
            <Blocks aria-hidden="true" data-icon="inline-start" />
            Shared Question Blocks
          </Link>
          <Link to="/admin/services/new" className={buttonVariants()}>
            <Plus aria-hidden="true" data-icon="inline-start" />
            Add Service
          </Link>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <ServicesDataTable
          data={services}
          departments={departments}
          onView={setSelectedService}
        />
      </div>

      <ServiceDetailSheet
        service={selectedService}
        editLabel={
          selectedService && selectedService.variant_count > 1
            ? "Manage Service Group"
            : "Edit Service"
        }
        open={selectedService !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedService(null);
        }}
        onEdit={() => {
          const service = selectedService;
          if (!service) return;
          setSelectedService(null);
          if (service.variant_count > 1) {
            navigate({
              to: "/admin/services/groups/$displayGroup",
              params: { displayGroup: service.dossier_key },
              search: { scope: undefined },
            });
          } else {
            navigate({
              to: "/admin/services/$serviceCode/edit",
              params: { serviceCode: service.service_code },
            });
          }
        }}
      />
    </section>
  );
}
