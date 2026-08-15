import { Link, useRouter } from "@tanstack/react-router";
import {
  ClipboardCheck,
  LayoutDashboard,
  RefreshCw,
  Settings2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { formatLongDate } from "../dashboard.utils";

export function DashboardHeader({ generatedAt }: { generatedAt: string }) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await router.invalidate();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="dashboard-hero">
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
            <LayoutDashboard className="size-4" /> CiviCheck administration
          </div>
          <h1 className="text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
            Operations dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            A current view of requests, service demand, and CCRO personnel.
            <span className="ml-1 whitespace-nowrap">
              {formatLongDate(generatedAt)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/requests" className="dashboard-hero-action">
            <ClipboardCheck className="size-4" /> Requests
          </a>
          <Link to="/admin/services" className="dashboard-hero-action">
            <Settings2 className="size-4" /> Services
          </Link>
          <Link to="/admin/staff" className="dashboard-hero-action">
            <Users className="size-4" /> Staff
          </Link>
          <button
            type="button"
            onClick={refresh}
            disabled={isRefreshing}
            className="dashboard-hero-action disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw
              className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>
    </header>
  );
}
