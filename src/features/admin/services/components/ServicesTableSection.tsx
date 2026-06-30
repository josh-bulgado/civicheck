import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ServicesDataTable } from "./ServicesDataTable";
import type { Service } from "../services.types";

interface ServicesTableSectionProps {
  services: Service[];
}

export function ServicesTableSection({ services }: ServicesTableSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-heading">
            Active Services Database
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select any service row to review its mandatory checklist and
            processing steps.
          </p>
        </div>
        <Button className="shrink-0">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Service
        </Button>
      </div>

      <ServicesDataTable data={services} />
    </div>
  );
}
