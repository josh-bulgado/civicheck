import {
  Bell,
  ClipboardCheck,
  Lock,
  MonitorSmartphone,
  Radar,
  Repeat,
} from "lucide-react";

const features = [
  {
    icon: ClipboardCheck,
    title: "Clear requirement checklists",
    desc: "Stop guessing. See exactly what to bring, before you leave the house.",
  },
  {
    icon: Radar,
    title: "Real-time status tracking",
    desc: "Check where your request stands, anytime, online.",
  },
  {
    icon: MonitorSmartphone,
    title: "Online or walk-in",
    desc: "Submit digitally, or have CCRO staff encode your request in person. Either way works.",
  },
  {
    icon: Repeat,
    title: "Fewer repeat trips",
    desc: "Pre-validation catches missing documents early, so you're not turned away at the counter.",
  },
  {
    icon: Bell,
    title: "Timely notifications",
    desc: "Get updates by email and in-system as your request moves forward.",
  },
  {
    icon: Lock,
    title: "Role-based access",
    desc: "Your information is only visible to authorized CCRO personnel.",
  },
];

const WhyCiviCheckSection = () => {
  return (
    <section className="border-b border-border-light bg-white">
      <div className="civic-container civic-section">
        <div className="mb-12 max-w-2xl">
          <p className="civic-eyebrow-rule">Why CiviCheck</p>
          <h2 className="civic-title text-[clamp(1.75rem,3vw,2.125rem)] leading-tight">
            Built around the trip you shouldn't have to make twice
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border-light bg-border-light sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group bg-white p-6 transition-colors hover:bg-primary-tint"
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <Icon className="size-5" />
              </div>
              <h3 className="mb-2 text-[17px] font-bold leading-snug text-foreground">
                {title}
              </h3>
              <p className="text-[15px] leading-relaxed text-body">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyCiviCheckSection;
