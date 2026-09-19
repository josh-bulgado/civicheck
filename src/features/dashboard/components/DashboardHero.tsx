import { Link } from "@tanstack/react-router";

interface DashboardHeroProps {
  firstName: string;
  greeting: string;
  subhead: string;
}

export function DashboardHero({ firstName, greeting, subhead }: DashboardHeroProps) {
  return (
    <header className="dashboard-hero">
      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
            Applicant workspace
          </p>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{subhead}</p>
        </div>
        <Link
          to="/services"
          className="civic-press inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm hover:bg-primary-soft"
        >
          Check Requirements
        </Link>
      </div>
    </header>
  );
}
