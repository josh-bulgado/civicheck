import { CheckCircle2, ShieldCheck } from "lucide-react";
import { CityGovernmentIdentity, CiviCheckIdentity } from "~/components/brand/civic-identity";

export function AuthBrandPanel({
  title,
  description,
  benefits,
}: {
  title: string;
  description: string;
  benefits?: string[];
}) {
  return (
    <aside className="civic-auth-panel hidden min-h-dvh flex-1 flex-col justify-between p-12 lg:flex xl:p-16">
      <CiviCheckIdentity />

      <div className="max-w-md">
        <span className="mb-6 flex size-14 items-center justify-center rounded-lg border border-primary/15 bg-white text-primary shadow-sm">
          <ShieldCheck className="size-7" aria-hidden="true" />
        </span>
        <p className="civic-eyebrow">Official online service</p>
        <h2 className="civic-title text-3xl leading-tight">{title}</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{description}</p>
        {benefits?.length ? (
          <ul className="mt-8 space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm text-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                {benefit}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="border-t border-primary/10 pt-6">
        <CityGovernmentIdentity />
      </div>
    </aside>
  );
}
