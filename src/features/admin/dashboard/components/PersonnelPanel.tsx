import { Users } from "lucide-react";
import type { AdminDashboardData } from "../dashboard.types";
import { EmptyState } from "./DashboardPanelPrimitives";

export function PersonnelPanel({
  personnel,
}: Pick<AdminDashboardData, "personnel">) {
  const populatedRoles = personnel.byRole.filter((item) => item.count > 0);

  return (
    <section className="dashboard-panel p-5 sm:p-6" aria-labelledby="personnel-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="civic-eyebrow mb-1">Workforce</p>
          <h2 id="personnel-heading" className="text-xl font-bold tracking-tight">
            Personnel distribution
          </h2>
        </div>
        <div className="rounded-lg bg-primary-soft px-3 py-2 text-center text-primary">
          <p className="text-2xl font-extrabold tabular-nums">{personnel.total}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide">Internal</p>
        </div>
      </div>
      {personnel.total === 0 ? (
        <EmptyState
          icon={Users}
          title="No personnel records"
          description="Internal staff distribution will appear here."
          compact
        />
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">By role</h3>
            <div className="space-y-2">
              {populatedRoles.map((item) => (
                <DistributionRow key={item.role} label={item.label} count={item.count} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Active departments</h3>
            {personnel.byDepartment.length > 0 ? (
              <div className="space-y-2">
                {personnel.byDepartment.map((item) => (
                  <DistributionRow key={item.departmentName} label={item.departmentName} count={item.count} />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No personnel are assigned to an active department.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function DistributionRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-subtle px-3 py-2.5 text-sm">
      <span className="min-w-0 truncate font-medium">{label}</span>
      <span className="rounded-md bg-white px-2 py-0.5 font-bold tabular-nums shadow-xs">{count}</span>
    </div>
  );
}
