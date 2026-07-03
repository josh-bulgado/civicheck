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
    <section className="bg-white border-t border-basalt/5" id="how-it-works">
      <div className="max-w-[1120px] mx-auto px-5 py-20">
        {/* Section header */}
        <div className="mb-14">
          <p className="text-[12px] font-semibold tracking-widest uppercase text-lagoon mb-3">
            The process
          </p>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] text-basalt leading-tight">
            Four steps, one visit
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {/* Connector line — desktop only */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-5 left-[calc(100%-8px)] w-[calc(100%-32px)] h-px border-t-2 border-dashed border-lagoon/20" />
              )}

              {/* Step number */}
              <div className="w-10 h-10 rounded-full border-2 border-lagoon text-lagoon text-[15px] font-bold flex items-center justify-center mb-5">
                {step.number}
              </div>

              <h3 className="font-semibold text-[16px] text-basalt mb-2 leading-snug">
                {step.title}
              </h3>
              <p className="text-[14px] text-slate leading-relaxed">
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
