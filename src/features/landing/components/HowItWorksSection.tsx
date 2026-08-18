import { Reveal } from "~/components/motion/reveal";

const steps = [
  {
    number: "1",
    title: "Check requirements",
    desc: "See exactly what's required for your document, including anything you need from another office first.",
  },
  {
    number: "2",
    title: "Apply online",
    desc: "File your request online and upload documents for pre-validation, so nothing gets rejected at the counter.",
  },
  {
    number: "3",
    title: "Visit the CCRO",
    desc: "Bring your tracking number and original documents to the counter — no appointment needed.",
  },
  {
    number: "4",
    title: "Pay and claim on site",
    desc: "Pay at the CCRO cashier and claim your document once it's ready for release.",
  },
];

const stages = [
  { step: "01", label: "Submission" },
  { step: "02", label: "Validation" },
  { step: "03", label: "Processing" },
  { step: "04", label: "Approval" },
  { step: "05", label: "Release" },
];

const HowItWorksSection = () => {
  return (
    <section className="border-b border-border-light bg-background" id="how-it-works">
      <div className="civic-container civic-section">
        <div className="mb-12 max-w-2xl">
          <p className="civic-eyebrow-rule">The process</p>
          <h2 className="civic-title text-[clamp(1.75rem,3vw,2.125rem)] leading-tight">
            Four steps, one visit
          </h2>
        </div>

        <div className="relative">
          <span
            className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-linear-to-r from-transparent via-primary/25 to-transparent lg:block"
            aria-hidden="true"
          />

          <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <Reveal key={step.number} delay={index * 70}>
                <div className="civic-card civic-interactive civic-lift group relative h-full p-6 hover:border-primary/30 hover:shadow-[0_12px_28px_rgba(15,27,45,0.09)]">
                  <span className="mb-5 flex size-10 items-center justify-center rounded-full bg-primary text-[17px] font-bold text-white shadow-[0_4px_12px_rgba(11,77,162,0.25)] transition-transform duration-200 group-hover:scale-110">
                    {step.number}
                  </span>
                  <h3 className="mb-2 text-[19px] font-bold leading-snug text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-body">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/*
          The five tracked stages are the spine of the request record, and the
          four steps above are only what the applicant does. Stating them here
          — rather than in a section of their own — keeps the promise attached
          to the process it qualifies.
        */}
        <Reveal delay={100}>
          <div className="civic-card mt-6 flex flex-wrap items-center gap-x-6 gap-y-3.5 px-5.5 py-4.5">
            <p className="text-[12.5px] font-bold text-foreground">
              Every request follows five tracked stages
            </p>

            <ol className="flex min-w-70 flex-1 flex-wrap items-center gap-x-4 gap-y-2.5">
              {stages.map((stage) => (
                <li
                  key={stage.step}
                  className="flex items-center gap-1.75 text-[13px] text-body"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-[10px] font-bold text-primary">
                    {stage.step}
                  </span>
                  {stage.label}
                </li>
              ))}
            </ol>

            <p className="text-[12.5px] text-muted-2">
              Visible any time — no phone calls.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default HowItWorksSection;
