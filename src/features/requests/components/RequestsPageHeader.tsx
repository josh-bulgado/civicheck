import { Building2, ClipboardList } from "lucide-react";
import { CityGovernmentIdentity } from "~/components/brand/civic-identity";

interface RequestsPageHeaderProps {
  /** Set when the viewer is department-scoped (staff/supervisor). */
  departmentName?: string | null;
}

export function RequestsPageHeader({ departmentName }: RequestsPageHeaderProps) {
  return (
    <header className="dashboard-hero">
      <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-gold">
            <ClipboardList className="w-4 h-4" />
            <span>CCRO workspace</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
            Request Queue
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-white/75">
            {departmentName
              ? `Every request routed to the ${departmentName} department.`
              : "Every request in the office, grouped by the stage it's sitting in and the department handling it."}
          </p>
          {departmentName && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white/90">
              <Building2 className="size-3.5" aria-hidden="true" />
              {departmentName}
            </div>
          )}
        </div>

        <div className="self-start rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm md:self-center">
          <CityGovernmentIdentity inverse />
        </div>
      </div>
    </header>
  );
}
