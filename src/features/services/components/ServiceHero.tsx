import { getVisitBadge, summarizeWait, formatFee } from "~/features/services/service-utils";

interface Service {
  name: string;
  service_code: string;
  classification: string | null;
  fee: number | string;
  processing_time: string;
  steps_description: string[] | null;
  display_name: string | null;
}

interface ServiceHeroProps {
  service: Service;
  displayName: string;
}

const badgeToneClasses = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
} as const;

export function ServiceHero({ service, displayName }: ServiceHeroProps) {
  const visitBadge = getVisitBadge(service.processing_time);

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-primary-hover bg-primary px-5 py-5.5 text-white shadow-[0_14px_32px_rgba(0,59,134,0.16)] sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeToneClasses[visitBadge.tone]}`}
          >
            {visitBadge.label}
          </span>
          <span className="text-xs text-white/65">{service.service_code}</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {displayName}
        </h1>
      </div>

      <div className="flex shrink-0 gap-3">
        <div className="min-w-34.5 rounded-[10px] border border-white/20 bg-white/10 px-4.5 py-3.5">
          <p className="text-lg font-bold text-white">{formatFee(service.fee)}</p>
          <p className="text-xs text-white/65">Pay at cashier</p>
        </div>
        <div className="min-w-34.5 rounded-[10px] border border-white/20 bg-white/10 px-4.5 py-3.5">
          <p className="text-lg font-bold text-white">{summarizeWait(service.processing_time)}</p>
          <p className="text-xs text-white/65">At the office</p>
        </div>
      </div>
    </div>
  );
}
