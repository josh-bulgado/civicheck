import {
  ClipboardCheck,
  Monitor,
  Users,
  CheckCircle2,
  Bell,
  ShieldCheck,
} from "lucide-react";

const WhyCiviCheckSection = () => {
  const features = [
    {
      icon: <ClipboardCheck className="w-5 h-5" />,
      title: "Clear requirement checklists",
      desc: "See exactly what to bring before you leave the house.",
    },
    {
      icon: <Monitor className="w-5 h-5" />,
      title: "Real-time status tracking",
      desc: "Check where your request stands, anytime, from any device.",
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Online or walk-in",
      desc: "Submit digitally or have staff encode it in person. Either way works.",
    },
    {
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: "Fewer repeat trips",
      desc: "Pre-validation catches missing documents before you're turned away.",
    },
    {
      icon: <Bell className="w-5 h-5" />,
      title: "Timely notifications",
      desc: "Get updates by email and in-system as your request moves forward.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Role-based access",
      desc: "Your information is only visible to authorized CCRO personnel.",
    },
  ];

  return (
    <section className="border-t border-border bg-background">
      <div className="civic-container civic-section">
        {/* Section header */}
        <div className="mb-14">
          <p className="civic-eyebrow">
            Why CiviCheck
          </p>
          <h2 className="civic-title max-w-[440px] text-[clamp(1.75rem,3vw,2.5rem)] leading-tight">
            Built to save you a trip
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-4"
            >
              <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                {feature.icon}
              </div>
              <div>
                <h3 className="mb-1 text-[15px] font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyCiviCheckSection;
