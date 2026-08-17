import {
  CityGovernmentIdentity,
  CiviCheckIdentity,
} from "~/components/brand/civic-identity";
import { cn } from "~/lib/utils";

type BrandStep = {
  title: string;
  /** Omit to run the sequence as bare titles — the step names alone carry it. */
  description?: string;
};

/**
 * The dark column of the auth screens. Three fixed bands — office identity,
 * the pitch, the city seal — so the panel keeps the same shape whether it is
 * carrying a benefit list or a numbered sequence.
 *
 * Both lists are ruled rather than boxed: hairlines separate the items without
 * adding a second surface competing with the form card opposite.
 */
export function AuthBrandPanel({
  eyebrow = "Official online service",
  title,
  description,
  benefits,
  steps,
}: {
  eyebrow?: string;
  title: string;
  /** Optional — a headline that already states the promise needs no gloss. */
  description?: string;
  benefits?: string[];
  steps?: BrandStep[];
}) {
  return (
    <aside className="civic-auth-panel hidden min-h-dvh w-110 shrink-0 flex-col p-9 lg:flex xl:w-130 xl:px-11">
      <CiviCheckIdentity inverse />

      <div className="flex flex-1 flex-col justify-center py-10">
        <div className="max-w-md">
          <p className="text-xs font-bold tracking-[0.12em] text-white/55 uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-4 text-[32px] leading-[1.15] font-bold tracking-[-0.02em] text-balance text-white xl:text-[34px]">
            {title}
          </h2>
          {description ? (
            <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-white/75">
              {description}
            </p>
          ) : null}

          {benefits?.length ? (
            <ul className="mt-7 border-t border-white/15">
              {benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-center gap-3 border-b border-white/15 py-3 text-[15px] leading-snug text-white/90 last:border-b-0"
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-white/55"
                    aria-hidden="true"
                  />
                  {benefit}
                </li>
              ))}
            </ul>
          ) : null}

          {steps?.length ? (
            <ol className="mt-7 border-t border-white/15">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className={cn(
                    "flex gap-3.5 border-b border-white/15 py-3.5 last:border-b-0",
                    // With no second line to align against, the number reads as
                    // dropped unless it centres on the title it belongs to.
                    step.description ? "items-start" : "items-center",
                  )}
                >
                  <span
                    className={cn(
                      "w-5 shrink-0 text-[13px] font-bold text-white/55 tabular-nums",
                      step.description && "pt-px",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {step.description ? (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[15px] font-bold text-white">
                        {step.title}
                      </p>
                      <p className="text-[13.5px] leading-snug text-white/65">
                        {step.description}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[15px] font-bold text-white">
                      {step.title}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/15 pt-6">
        <CityGovernmentIdentity inverse />
      </div>
    </aside>
  );
}
