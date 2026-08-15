import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authed/staff-dashboard")({
  component: StaffDashboard,
});

function StaffDashboard() {
  return (
    <div className="dashboard-page">
      <header className="dashboard-hero">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white/90">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              CCRO operations
            </div>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">Staff Dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              A focused workspace for request intake, document validation, and civil registry processing.
            </p>
          </div>
          <Link to="/requests" className="dashboard-hero-action">Open request queue<ArrowRight className="size-4"/></Link>
        </div>
      </header>

      <section aria-labelledby="staff-tools-heading">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Workflow modules</p>
          <h2 id="staff-tools-heading" className="mt-1 text-xl font-bold tracking-tight text-foreground">Your operational workspace</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <ToolPreview icon={FileClock} title="Request queue" description="Review newly submitted requests and route them to the correct processing stage." href="/requests" />
          <ToolPreview icon={ClipboardCheck} title="Walk-in intake" description="Create an assisted request while preserving requester and document-subject identities." href="/requests/new" />
          <ToolPreview icon={LayoutDashboard} title="Archived records" description="Review terminal records retained in the soft-archived queue." href="/requests?archived=true" />
        </div>
      </section>
    </div>
  );
}

function ToolPreview({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof FileClock;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <article className="dashboard-panel flex min-h-56 flex-col p-5 sm:p-6">
      <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <Link to={href} className="mt-auto flex items-center gap-1.5 pt-5 text-xs font-bold uppercase tracking-[0.1em] text-primary">
        Open workspace
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </article>
  );
}
