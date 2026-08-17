import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ServiceDetailSheet } from "~/features/services/components/ServiceDetailSheet";
import { ServicesDataTable } from "./ServicesDataTable";
import { ServiceFormDialog } from "./ServiceFormDialog";
import type { Department } from "../../departments.queries";
import type { Service } from "../services.types";

interface ServicesTableSectionProps {
  services: Service[];
  departments: Department[];
}

export function ServicesTableSection({
  services,
  departments,
}: ServicesTableSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  // null while the form is open ⇒ create mode; a service ⇒ edit that service.
  const [editing, setEditing] = useState<Service | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setFormOpen(true);
  }

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
        <Button className="shrink-0" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Service
        </Button>
      </div>

      <div className="p-5 sm:p-6">
        <ServicesDataTable
          data={services}
          onView={setSelectedService}
          onEdit={openEdit}
        />
      </div>

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        services={services}
        departments={departments}
        service={editing}
      />

      <ServiceDetailSheet
        service={selectedService}
        open={selectedService !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedService(null);
        }}
        onEdit={(service) => {
          setSelectedService(null);
          openEdit(service);
        }}
      />
    </section>
  );
}
