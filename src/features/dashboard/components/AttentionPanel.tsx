import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle } from "lucide-react";
import type { AttentionItem } from "../types";

interface AttentionPanelProps {
  items: AttentionItem[];
}

export function AttentionPanel({ items }: AttentionPanelProps) {
  return (
    <div className="dashboard-panel overflow-hidden">
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          Needs your attention
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
          {items.length > 0
            ? `${items.length} request${items.length === 1 ? "" : "s"} need action`
            : "You're all caught up"}
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
          Nothing needs your input right now — we'll notify you when something changes.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map(({ request, tone, message, action }) => (
            <li key={request.id} className="flex items-start gap-3.5 px-5 py-4 sm:px-6">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${tone === "warning" ? "status-warning" : "status-success"}`}
              >
                {tone === "warning" ? (
                  <AlertTriangle className="size-4.5" aria-hidden="true" />
                ) : (
                  <CheckCircle className="size-4.5" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">
                  {request.tracking_number} ·{" "}
                  {request.services_registry?.name || request.request_type}
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                  {message}
                </p>
              </div>
              <Link
                to="/my-requests/$requestId"
                params={{ requestId: request.id }}
                className="civic-nudge shrink-0 whitespace-nowrap pt-0.5 text-[13px] font-bold text-primary"
              >
                {action} →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
