import { Check } from "lucide-react";
import { CityGovernmentIdentity, CiviCheckIdentity } from "~/components/brand/civic-identity";

type BrandStep = {
  title: string;
  description: string;
};

export function AuthBrandPanel({
  eyebrow = "Official online service",
  title,
  description,
  benefits,
  steps,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  benefits?: string[];
  steps?: BrandStep[];
}) {
  return (
    <aside className="civic-auth-panel hidden min-h-dvh w-110 shrink-0 flex-col justify-between p-10 lg:flex xl:w-130 xl:p-12">
      <CiviCheckIdentity inverse />

      <div className="max-w-md">
        <p className="mb-6 text-[13px] font-bold tracking-[0.12em] text-white/60 uppercase">
          {eyebrow}
        </p>
        <h2 className="text-[34px] leading-[1.15] font-bold tracking-[-0.015em] text-white xl:text-[38px]">
          {title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-white/80">{description}</p>

        {benefits?.length ? (
          <ul className="mt-7 flex flex-col gap-3.5">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-[15px] leading-snug text-white/90">
                <span className="mt-0.5 flex size-5.5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Check className="size-3" strokeWidth={3.4} aria-hidden="true" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        ) : null}

        {steps?.length ? (
          <ol className="mt-7 flex flex-col gap-3">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3.5 rounded-[10px] bg-white/10 px-4.5 py-4">
                <span className="shrink-0 text-base font-bold text-white/60">{index + 1}</span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[15px] font-bold text-white">{step.title}</p>
                  <p className="text-sm leading-snug text-white/70">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      <div className="border-t border-white/15 pt-6">
        <CityGovernmentIdentity inverse />
      </div>
    </aside>
  );
}
