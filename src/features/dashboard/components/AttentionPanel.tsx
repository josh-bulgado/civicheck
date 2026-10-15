import { QuietLink } from "~/components/quiet-link";
import { CircleCheckBig, FileWarning } from "lucide-react";
import { cn } from "~/lib/utils";
import type { AttentionItem } from "../types";

interface AttentionPanelProps {
  /** Never empty: the dashboard leaves this card out when nothing needs input. */
  items: AttentionItem[];
}

// Red is for what the applicant must act on; green is for what is ready.
const TILE_TONE: Record<AttentionItem["tone"], string> = {
  warning: "bg-portal-danger-soft text-destructive",
  success: "bg-tone-success-soft text-tone-success",
};

export function AttentionPanel({ items }: AttentionPanelProps) {
  return (
    <section className="rounded-[28px] bg-card px-5 pt-5 pb-2 shadow-portal-card md:px-7 md:pt-5 md:pb-2">
      <h2 className="portal-heading">Needs your attention</h2>
      <ul className="mt-2 flex flex-col divide-y divide-border-lighter">
        {items.map(({ request, tone, message, action }) => {
          const Icon = tone === "warning" ? FileWarning : CircleCheckBig;
          const service =
            request.services_registry?.display_name ||
            request.services_registry?.name ||
            request.request_type;

          return (
            <li
              key={request.id}
              className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 py-3 md:grid-cols-[3rem_minmax(0,1fr)_auto]"
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-2xl",
                  TILE_TONE[tone],
                )}
              >
                <Icon className="size-5.5" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-[17px] leading-[normal] font-semibold text-foreground md:text-[19px]">
                    {service}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {request.tracking_number}
                  </span>
                </p>
                <p className="text-[15px] text-body-2 text-pretty">{message}</p>
              </div>
              <QuietLink
                to="/my-requests/$requestId"
                params={{ requestId: request.id }}
                className="civic-press inline-flex h-11 items-center rounded-full bg-primary px-5.5 text-[15px] font-semibold whitespace-nowrap text-white hover:bg-primary-hover max-md:col-start-2 max-md:justify-self-start"
              >
                {action}
              </QuietLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
