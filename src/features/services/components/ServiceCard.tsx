import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import {
  formatFee,
  getVisitBadge,
  isFullyOnline,
  summarizeWait,
} from "~/features/services/service-utils";

export interface ServiceProps {
  service_code: string;
  name: string;
  classification: string;
  fee: number | string;
  processing_time: string;
  display_group: string | null;
  display_name: string | null;
  steps_description: string[] | null;
  requirement_count: number;
}

const badgeToneClasses = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-primary-soft text-primary",
} as const;

const ServiceCard = (service: ServiceProps) => {
  const routeCode = service.display_group ?? service.service_code;
  const fullyOnline = isFullyOnline(service.steps_description);
  const visitBadge = getVisitBadge(service.processing_time);
  const isFree = Number(service.fee) === 0;
  const title = service.display_name ?? service.name;
  const requirementLabel =
    service.requirement_count === 1
      ? "1 requirement"
      : `${service.requirement_count} requirements`;

  return (
    <article className="group flex h-full flex-col gap-4 rounded-xl border border-border-strong bg-white p-6 text-card-foreground shadow-[0_1px_2px_rgba(23,33,43,0.04)] transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-[0_6px_18px_rgba(23,33,43,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
          <FileText className="size-5" aria-hidden="true" />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {fullyOnline ? (
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${badgeToneClasses.info}`}
            >
              Fully online
            </span>
          ) : (
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${badgeToneClasses[visitBadge.tone]}`}
            >
              {visitBadge.label}
            </span>
          )}
          {isFree && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${badgeToneClasses.success}`}
            >
              No fee
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="line-clamp-2 text-[19px] font-bold leading-[1.3] tracking-[-0.01em] text-foreground">
          {title}
        </h2>
        <p className="text-[15px] text-muted-foreground">{requirementLabel}</p>
      </div>

      <dl className="flex flex-col gap-3 border-y border-border-lighter py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[15px] text-muted-foreground">
            {fullyOnline ? "Answered in" : "Released"}
          </dt>
          <dd className="text-right text-[15px] font-bold text-foreground">
            {summarizeWait(service.processing_time)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-[15px] text-muted-foreground">Fee at cashier</dt>
          <dd
            className={`text-right text-[17px] font-bold ${isFree ? "text-success" : "text-foreground"}`}
          >
            {formatFee(service.fee, service.display_group)}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex gap-2.5">
        <Link
          to="/service/$serviceCode"
          params={{ serviceCode: routeCode }}
          preload="intent"
          className="inline-flex flex-1 min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-[15px] font-bold text-primary-foreground outline-none transition-colors hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          View requirements
        </Link>
        <Link
          to="/apply/$serviceCode/details"
          params={{ serviceCode: routeCode }}
          preload="intent"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border-strong bg-white px-4 text-[15px] font-bold text-foreground outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Start
        </Link>
      </div>
    </article>
  );
};

export default ServiceCard;
