import { Link } from "@tanstack/react-router";
import { Blocks, ShieldCheck } from "lucide-react";

export function ServicesPageHeader() {
  return (
    <header className="dashboard-hero">
      <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-gold">
            <ShieldCheck className="w-4 h-4" />
            <span>Authorized administration</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
            Services Registry
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-white/75">
            Configure and inspect active civil registrar services, associated
            processing guidelines, filing fees, and requirement checklists for
            the Legazpi City Government.
          </p>
        </div>
        <Link
          to="/admin/services/blocks"
          search={{ block: undefined }}
          className="inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-lg border border-white/25 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 md:self-center"
        >
          <Blocks className="size-4" aria-hidden="true" />
          Shared question blocks
        </Link>
      </div>
    </header>
  );
}
