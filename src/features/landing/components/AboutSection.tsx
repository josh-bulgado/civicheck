import { CityGovernmentIdentity } from "~/components/brand/civic-identity";

const stages = [
  { step: "01", label: "Submission" },
  { step: "02", label: "Validation" },
  { step: "03", label: "Processing" },
  { step: "04", label: "Approval" },
  { step: "05", label: "Release" },
];

const AboutSection = () => {
  return (
    <section className="border-b border-border-light bg-white">
      <div className="civic-container civic-section grid grid-cols-1 gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div>
          <p className="civic-eyebrow-rule">About the office</p>
          <h2 className="civic-title mb-5 text-[clamp(1.75rem,3vw,2.125rem)] leading-tight">
            The same office. A clearer process.
          </h2>
          <p className="max-w-prose text-lg leading-relaxed text-body">
            The City Civil Registrar Office (CCRO) of Legazpi City registers and
            issues official birth, marriage, death, and other civil registry
            records. CiviCheck was built to make that process clearer and faster
            for residents and staff alike, without changing how the office
            legally operates.
          </p>

          <div className="mt-8 border-t border-border pt-6">
            <CityGovernmentIdentity />
          </div>
        </div>

        <div className="civic-card p-7">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-2">
            Every request follows
          </p>
          <p className="mb-6 text-lg font-bold text-foreground">
            Five tracked stages
          </p>

          <ol className="relative flex flex-col gap-5">
            <span
              className="absolute bottom-3 left-3.75 top-3 w-px bg-border"
              aria-hidden="true"
            />
            {stages.map((stage) => (
              <li key={stage.step} className="relative flex items-center gap-4">
                <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-white font-mono text-[11px] font-bold text-primary">
                  {stage.step}
                </span>
                <span className="text-[15px] font-semibold text-foreground">
                  {stage.label}
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-6 border-t border-border-light pt-5 text-sm leading-relaxed text-muted-foreground">
            You can see which stage your request is on at any time — no phone
            calls, no guessing.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
