import { healthStatusContent } from "../system-health.constants";
import type { HealthStatus, ServiceHealth } from "../system-admin.types";
import { formatHealthTimestamp } from "../system-health.utils";
import { HealthRefreshButton } from "./HealthRefreshButton";

function ServiceRailItem({ service }: { service: ServiceHealth }) {
  const status = healthStatusContent[service.status];

  return (
    <li className="min-w-0 flex-1">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-white/15 ring-1 ring-inset ring-white/15"
        aria-hidden="true"
      >
        <div className={`h-full rounded-full ${status.dotClassName}`} />
      </div>
      <span className="mt-1.5 block truncate text-[0.6875rem] font-semibold text-white/80">
        {service.name}
      </span>
      <span className="sr-only">: {status.label}</span>
    </li>
  );
}

export function HealthHeaderStatus({
  status,
  checkedAt,
  services,
}: {
  status: HealthStatus;
  checkedAt: string;
  services: ServiceHealth[];
}) {
  const overall = healthStatusContent[status];

  return (
    <div
      className="w-full rounded-xl border border-white/20 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm sm:w-80"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-white/75">
            Current state
          </p>
          <p className="mt-1 flex items-center gap-2 text-base font-bold text-white">
            <span
              className={`size-2.5 rounded-full ring-4 ring-white/10 motion-safe:animate-pulse ${overall.dotClassName}`}
              aria-hidden="true"
            />
            {overall.label}
          </p>
        </div>
        <HealthRefreshButton />
      </div>

      {services.length > 0 ? (
        <ul
          className="mt-4 flex gap-2.5 border-t border-white/15 pt-3"
          aria-label="Core service status"
        >
          {services.map((service) => (
            <ServiceRailItem key={service.key} service={service} />
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-xs text-white/80">
        Checked{" "}
        <time dateTime={checkedAt} className="font-mono tabular-nums">
          {formatHealthTimestamp(checkedAt)}
        </time>
      </p>
    </div>
  );
}
