import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, FileText, PhilippinePeso } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { formatFee } from "~/features/services/service-utils";

export interface ServiceProps {
  service_code: string;
  name: string;
  classification: string;
  fee: number | string;
  processing_time: string;
  display_group: string | null;
  display_name: string | null;
}

const ServiceCard = (service: ServiceProps) => {
  const variant = service.classification as
    | "simple"
    | "complex"
    | "highly_technical";
  const label = service.classification.replace("_", " ");

  return (
    <div className="rounded-lg border border-border p-4 flex flex-col gap-2 h-full bg-card text-card-foreground shadow-xs group">
      <div className="flex items-start justify-between gap-3">
        <div className="bg-primary/10 rounded-md p-2 w-fit text-primary">
          <FileText className="size-4" />
        </div>

        <Badge variant={variant} className="capitalize">
          {label}
        </Badge>
      </div>
      
      <h3 className="font-bold text-sm text-foreground mt-1 line-clamp-2 min-h-[2.5rem]">
        {service.display_name ?? service.name}
      </h3>
      
      <div className="flex flex-col gap-1 text-xs text-muted-foreground flex-1">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0 text-primary" />
          <span>
            Processing: <span className="font-semibold text-foreground">{service.processing_time}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <PhilippinePeso className="size-3.5 shrink-0 text-primary" />
          <span>
            Service Fee:{" "}
            <span className="font-semibold text-foreground">
              {formatFee(service.fee, service.display_group)}
            </span>
          </span>
        </div>
      </div>
      
      <div className="pt-2 mt-auto">
        <Link
          to="/service/$serviceCode"
          params={{ serviceCode: service.display_group ?? service.service_code }}
          className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground px-3 py-1.5 text-xs font-medium transition-colors text-foreground"
        >
          View Requirements
          <ArrowRight className="size-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default ServiceCard;
