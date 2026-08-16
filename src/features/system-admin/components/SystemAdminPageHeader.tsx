import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import { CityGovernmentIdentity } from "~/components/brand/civic-identity";

export function SystemAdminPageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="dashboard-hero">
      <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-gold">
            <ShieldCheck className="size-4" aria-hidden="true" />
            System administration
          </div>
          <div className="flex items-center gap-3">
            <Icon
              className="hidden size-8 text-white/85 sm:block"
              aria-hidden="true"
            />
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
              {title}
            </h1>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            {description}
          </p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
