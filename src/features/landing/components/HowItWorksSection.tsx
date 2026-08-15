const HowItWorksSection = () => {
  const steps = [
    {
      number: "1",
      title: "Select your document",
      desc: "Choose the civil registry document you need — birth, marriage, death, or certified true copy.",
    },
    {
      number: "2",
      title: "Review your checklist",
      desc: "See exactly what's required, including anything you need from another office first.",
    },
    {
      number: "3",
      title: "Submit & get a tracking number",
      desc: "Submit online or at the CCRO window, and get a tracking number to follow your request.",
    },
    {
      number: "4",
      title: "Track, get notified, claim",
      desc: "Watch your request move through validation, processing, and approval. Claim it when ready.",
    },
  ];

  return (
    <section className="border-t border-border bg-white" id="how-it-works">
      <div className="civic-container civic-section">
        {/* Section header */}
        <div className="mb-14">
          <p className="civic-eyebrow">
            The process
          </p>
          <h2 className="civic-title text-[clamp(1.75rem,3vw,2.5rem)] leading-tight">
            Four steps, one visit
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {/* Connector line — desktop only */}
              {i < steps.length - 1 && (
                <div className="absolute left-[calc(100%-8px)] top-5 hidden h-px w-[calc(100%-32px)] border-t-2 border-dashed border-primary/20 lg:block" />
              )}

              {/* Step number */}
              <div className="mb-5 flex size-10 items-center justify-center rounded-full bg-primary-soft text-[15px] font-bold text-primary">
                {step.number}
              </div>

              <h3 className="mb-2 text-[16px] font-semibold leading-snug text-foreground">
                {step.title}
              </h3>
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
