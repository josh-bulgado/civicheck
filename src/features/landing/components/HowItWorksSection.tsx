import React from "react";

const HowItWorksSection = () => {
  const steps = [
    {
      number: "1",
      title: "Select Your Document",
      desc: "Choose the civil registry document you need.",
    },
    {
      number: "2",
      title: "Review Your Checklist",
      desc: "See exactly what's required, including anything you need from another office first.",
    },
    {
      number: "3",
      title: "Submit & Get a Tracking Number",
      desc: "Submit online or at the CCRO window, and get a tracking number to follow your request.",
    },
    {
      number: "4",
      title: "Track, Get Notified, Claim",
      desc: "Watch your request move through validation, processing, and approval, get notified when it's ready, then claim it at the CCRO.",
    },
  ];

  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-[28px] font-bold text-[#1b1b1b] inline-block relative pb-3">
            How it works
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#d4a017]" />
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[900px] mx-auto">
          {steps.map((step, i) => (
            <div key={step.number} className="relative text-center">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[60%] w-[80%] h-[2px] bg-gray-200" />
              )}
              <div className="w-12 h-12 rounded-full bg-[#005ea2] text-white text-lg font-bold flex items-center justify-center mx-auto mb-4 relative z-10">
                {step.number}
              </div>
              <h3 className="font-bold text-[15px] text-[#1b1b1b] mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-[#5b616b] leading-relaxed">
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
