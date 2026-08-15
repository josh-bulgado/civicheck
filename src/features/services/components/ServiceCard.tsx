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
    <article className="group flex h-full flex-col rounded-xl border border-border-strong bg-white p-5 text-card-foreground shadow-[0_1px_2px_rgba(23,33,43,0.04)] transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-[0_6px_18px_rgba(23,33,43,0.07)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
          <FileText className="size-5" aria-hidden="true" />
        </div>

        <Badge variant={variant} className="capitalize">
          {label}
        </Badge>
      </div>

      <h2 className="mt-4 min-h-[3rem] line-clamp-2 text-base font-bold leading-6 tracking-[-0.01em] text-foreground">
        {service.display_name ?? service.name}
      </h2>

      <dl className="mt-5 flex-1 divide-y divide-border border-y border-border">
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 py-3">
          <Clock
            className="row-span-2 mt-0.5 size-4 text-primary"
            aria-hidden="true"
          />
          <dt className="text-xs font-medium text-muted-foreground">
            Processing time
          </dt>
          <dd className="mt-0.5 text-sm font-semibold leading-5 text-foreground">
            {service.processing_time}
          </dd>
        </div>

        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 py-3">
          <PhilippinePeso
            className="row-span-2 mt-0.5 size-4 text-primary"
            aria-hidden="true"
          />
          <dt className="text-xs font-medium text-muted-foreground">
            Service fee
          </dt>
          <dd className="mt-0.5 text-sm font-semibold leading-5 text-foreground">
            {formatFee(service.fee, service.display_group)}
          </dd>
        </div>
      </dl>

      <Link
        to="/service/$serviceCode"
        params={{
          serviceCode: service.display_group ?? service.service_code,
        }}
        preload="intent"
        className="-mx-2 mt-3 inline-flex min-h-11 items-center justify-between gap-2 rounded-lg px-2 text-sm font-bold text-primary outline-none transition-colors hover:bg-primary/5 hover:text-primary-hover focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        View requirements
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </article>
  );
};

export default ServiceCard;
