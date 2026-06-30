import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Building2, HelpCircle } from "lucide-react";
import { getAdminServices } from "~/features/admin/services/services.queries";
import { ServicesDataTable } from "~/features/admin/services/components/ServicesDataTable";

export const Route = createFileRoute("/_authed/admin-dashboard")({
  loader: () => getAdminServices(),
  component: AdminDashboard,
});

function AdminDashboard() {
  const services = Route.useLoaderData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 -mt-4 -mr-4 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 -mb-4 -ml-4 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Security Zone</span>
            </div>
            <h1 className="text-3xl font-bold font-heading text-white tracking-tight">
              Services Registry
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Configure and inspect active civil registrar services, associated processing guidelines, 
              filing fees, and requirement checklists for the Legazpi City Government.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xs border border-white/10 rounded-xl p-4 self-start md:self-center">
            <Building2 className="w-8 h-8 text-indigo-400" />
            <div className="text-xs">
              <p className="font-semibold text-white">Legazpi City CCRO</p>
              <p className="text-slate-400 mt-0.5">Office of the Civil Registrar</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">Active Services Database</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select any service row to review its mandatory checklist and processing steps.
            </p>
          </div>
        </div>

        <ServicesDataTable data={services} />
      </div>
    </div>
  );
}
