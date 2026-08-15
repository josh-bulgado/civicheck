import { BadgeCheck } from "lucide-react";
import type { AdminDashboardData } from "../dashboard.types";
import {
  formatAge,
  getPaymentLabel,
  getPaymentTone,
  getStatusLabel,
  getStatusTone,
} from "../dashboard.utils";
import { EmptyState, PanelHeader, StatusPill } from "./DashboardPanelPrimitives";

export function AttentionQueue({
  attentionItems,
  generatedAt,
}: Pick<AdminDashboardData, "attentionItems" | "generatedAt">) {
  const now = new Date(generatedAt).getTime();

  return (
    <section className="dashboard-panel overflow-hidden" aria-labelledby="attention-heading">
      <PanelHeader
        eyebrow="Action center"
        title="Attention queue"
        description="Oldest incomplete, approval, release, and unpaid requests first."
        actionHref="/requests"
        headingId="attention-heading"
      />
      {attentionItems.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="Nothing needs attention"
          description="Priority requests will appear here as work arrives."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-y border-border bg-surface-subtle text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Request</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-5 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attentionItems.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-surface-subtle">
                  <td className="px-5 py-4 font-mono text-xs font-bold text-foreground">{item.trackingNumber}</td>
                  <td className="max-w-[280px] px-4 py-4 font-medium"><span className="line-clamp-2">{item.serviceName}</span></td>
                  <td className="px-4 py-4"><StatusPill className={getStatusTone(item.status)}>{getStatusLabel(item.status)}</StatusPill></td>
                  <td className="px-4 py-4"><StatusPill className={getPaymentTone(item.paymentStatus)}>{getPaymentLabel(item.paymentStatus)}</StatusPill></td>
                  <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{formatAge(item.submittedAt, now)}</td>
                  <td className="px-5 py-4 text-xs font-semibold text-foreground">{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
