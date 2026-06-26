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
      icon: <ClipboardCheck className="w-7 h-7" />,
      title: "Clear Requirement Checklists",
      desc: "Stop guessing. See exactly what to bring, before you leave the house.",
    },
    {
      icon: <Monitor className="w-7 h-7" />,
      title: "Real-Time Status Tracking",
      desc: "Check where your request stands, anytime, online.",
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: "Online or Walk-In",
      desc: "Submit digitally, or have CCRO staff encode your request in person. Either way works.",
    },
    {
      icon: <CheckCircle2 className="w-7 h-7" />,
      title: "Fewer Repeat Trips",
      desc: "Pre-validation catches missing documents early, so you're not turned away at the counter.",
    },
    {
      icon: <Bell className="w-7 h-7" />,
      title: "Timely Notifications",
      desc: "Get updates by email and in-system as your request moves forward.",
    },
    {
      icon: <ShieldCheck className="w-7 h-7" />,
      title: "Role-Based Access",
      desc: "Your information is only visible to authorized CCRO personnel.",
    },
  ];

  return (
    <section className="bg-[#f1f1f1]">
      <div className="max-w-[1200px] mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-[28px] font-bold text-[#1b1b1b] inline-block relative pb-3">
            Why CiviCheck
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#d4a017]" />
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <a
              key={feature.title}
              href="#"
              className="bg-white p-6 rounded border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all group block"
            >
              <div className="text-[#205493] mb-4">{feature.icon}</div>
              <h3 className="text-lg font-bold text-[#1b1b1b] mb-2 group-hover:text-[#205493] transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-[#5b616b] leading-relaxed">
                {feature.desc}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyCiviCheckSection;
