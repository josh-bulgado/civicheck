import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle } from "lucide-react";
import type { AttentionItem } from "../types";

interface AttentionPanelProps {
  items: AttentionItem[];
}

const TILE_TONE: Record<AttentionItem["tone"], string> = {
  warning: "bg-tone-warning-soft text-tone-warning",
  success: "bg-tone-success-soft text-tone-success",
};

export function AttentionPanel({ items }: AttentionPanelProps) {
  return (
    <section className="portal-card flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-7">
      <h2 className="portal-heading">Needs your attention</h2>
      {items.length === 0 ? (
        <div className="border-t border-border-lighter pt-4">
          <p className="text-sm font-bold text-foreground">You're all caught up</p>
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
            Nothing needs your input right now — we'll notify you when something changes.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {items.map(({ request, tone, message, action }) => (
            <li
              key={request.id}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-3.5 border-t border-border-lighter py-4"
            >
              <span
                className={`flex size-10 items-center justify-center rounded-xl ${TILE_TONE[tone]}`}
              >
                {tone === "warning" ? (
                  <AlertTriangle className="size-5" aria-hidden="true" />
                ) : (
                  <CheckCircle className="size-5" aria-hidden="true" />
                )}
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold text-foreground">
                  {request.tracking_number} ·{" "}
                  {request.services_registry?.name || request.request_type}
                </p>
                <p className="text-[13px] leading-[1.45] text-muted-foreground text-pretty">
                  {message}
                </p>
              </div>
              <Link
                to="/my-requests/$requestId"
                params={{ requestId: request.id }}
                className="civic-press inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-semibold whitespace-nowrap text-white hover:bg-primary-hover"
              >
                {action}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
