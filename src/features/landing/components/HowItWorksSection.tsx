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
    <section className="bg-background" id="how-it-works">
      <div className="civic-container civic-section">
        <div className="mb-14">
          <p className="civic-eyebrow">The process</p>
          <h2 className="civic-title text-[clamp(1.75rem,3vw,2.125rem)] leading-tight">
            Four steps, one visit
          </h2>
        </div>

        <div className="relative">
          <svg
            viewBox="0 0 1000 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 top-0 z-0 hidden h-14 w-full lg:block"
            aria-hidden="true"
          >
            <path
              d="M125,32 C225,32 275,82 375,82 C475,82 525,82 625,82 C725,82 775,32 858,32"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-primary/30"
            />
            <polygon
              points="852,22 852,42 875,32"
              className="fill-primary/50"
            />
          </svg>

          <div className="relative z-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {steps.map((step) => (
              <div key={step.number}>
                <div className="mb-5 flex size-9 items-center justify-center rounded-full bg-primary text-[17px] font-bold text-white">
                  {step.number}
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
