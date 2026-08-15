import { ShieldCheck, UserRoundCog } from "lucide-react";
import { CityGovernmentIdentity } from "~/components/brand/civic-identity";

export function StaffPageHeader() {
  return (
    <header className="dashboard-hero">
      <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-gold">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Authorized administration
          </div>
          <div className="flex items-center gap-3">
            <UserRoundCog
              className="hidden size-8 text-white/85 sm:block"
              aria-hidden="true"
            />
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
              Staff
            </h1>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            Manage personnel access, roles, departments, and invitations for the
            City Civil Registrar Office.
          </p>
        </div>
        <div className="self-start rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm md:self-center">
          <CityGovernmentIdentity inverse />
        </div>
      </div>
    </header>
  );
}
