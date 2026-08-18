import { Link } from "@tanstack/react-router";
import { Baby, Gem, Heart, ScrollText } from "lucide-react";
import { Reveal } from "~/components/motion/reveal";

const services = [
  {
    icon: <Baby className="size-5" />,
    title: "Birth Certificate",
    code: "OTCOLB-MARITAL",
    requirements: [
      "Certificate of Live Birth (PSA or local)",
      "Valid ID of requesting party",
      "Authorization letter (if representative)",
    ],
  },
  {
    icon: <Gem className="size-5" />,
    title: "Marriage Certificate",
    code: "MARRIAGE_ONTIME",
    requirements: [
      "Certificate of Marriage (PSA or local)",
      "Valid IDs of contracting parties",
      "Marriage License",
    ],
  },
  {
    icon: <Heart className="size-5" />,
    title: "Death Certificate",
    code: "DEATH_ONTIME",
    requirements: [
      "Certificate of Death (PSA or local)",
      "Valid ID of informant",
      "Burial permit",
    ],
  },
  {
    icon: <ScrollText className="size-5" />,
    title: "Certified True Copy",
    code: "CTC-LOCAL",
    requirements: [
      "Original registered document on file",
      "Valid ID of requesting party",
      "Notarized affidavit (if needed)",
    ],
  },
];

const ServicesSection = () => {
  return (
    <section className="border-b border-border-light bg-white">
      <div className="civic-container civic-section">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="civic-eyebrow-rule">Services</p>
            <h2 className="civic-title text-[clamp(1.75rem,3vw,2.125rem)] leading-tight">
              Pick the document you need
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-body">
              Each card lists what you'll be asked to bring. Open one for the
              full checklist and fees.
            </p>
          </div>
          <Link
            to="/requirements"
            className="group inline-flex items-center gap-1.5 text-base font-bold text-primary hover:text-primary-hover"
          >
            See all services
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/*
            The requirements are on the card rather than behind a hover: the
            whole point of the page is that you should not have to interact
            with anything to find out what you need to bring.
          */}
          {services.map((service, index) => (
            <Reveal key={service.code} delay={index * 70}>
              <Link
                to="/requirements"
                search={{ code: service.code }}
                className="civic-card civic-interactive civic-lift group flex h-full flex-col gap-3.5 p-5 hover:border-primary/30 hover:shadow-[0_12px_28px_rgba(15,27,45,0.09)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10.5 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary transition-transform duration-200 group-hover:scale-110">
                    {service.icon}
                  </div>
                  <span className="text-[15px] font-semibold leading-tight text-foreground">
                    {service.title}
                  </span>
                </div>

                <div className="border-t border-border-lighter pt-3.25">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    You'll need · {service.requirements.length} requirements
                  </p>
                  <ul className="space-y-2">
                    {service.requirements.map((req) => (
                      <li
                        key={req}
                        className="flex items-start gap-2.25 text-[13px] leading-snug text-muted-foreground"
                      >
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pinned to the bottom so the call to action lines up across
                    cards whose requirement lists wrap to different heights. */}
                <p className="civic-nudge mt-auto flex items-center gap-1 text-[13px] font-semibold text-primary">
                  View requirements
                  <span data-nudge>→</span>
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
