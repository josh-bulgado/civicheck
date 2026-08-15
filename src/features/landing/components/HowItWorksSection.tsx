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
    title: "Get your queue number",
    desc: "Book a slot or walk in, and get a queue number so you know exactly when you'll be seen.",
  },
  {
    number: "4",
    title: "Pay and claim on site",
    desc: "Pay at the CCRO cashier and claim your document once it's ready for release.",
  },
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
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="civic-card group relative p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_28px_rgba(15,27,45,0.09)]"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary text-[17px] font-bold text-white shadow-[0_4px_12px_rgba(11,77,162,0.25)]">
                    {step.number}
                  </span>
                  {i < steps.length - 1 ? (
                    <span
                      className="hidden font-mono text-xs text-border-strong lg:block"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  ) : null}
                </div>
                <h3 className="mb-2 text-[19px] font-bold leading-snug text-foreground">
                  {step.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-body">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
