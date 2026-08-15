import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Baby, Gem, Heart, ScrollText } from "lucide-react";

const services = [
  {
    icon: <Baby className="size-5" />,
    title: "Birth Certificate",
    code: "BIRTH_ONTIME",
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
    code: "CTC_ISSUANCE",
    requirements: [
      "Original registered document on file",
      "Valid ID of requesting party",
      "Notarized affidavit (if needed)",
    ],
  },
];

const ServicesSection = () => {
  const [hoveredService, setHoveredService] = useState<number | null>(null);

  return (
    <section className="border-b border-border-light bg-white">
      <div className="civic-container civic-section">
        <div className="mb-10 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <p className="civic-eyebrow mb-2">Services</p>
            <h2 className="civic-title text-[clamp(1.75rem,3vw,2.125rem)] leading-tight">
              Pick the document you need
            </h2>
          </div>
          <Link
            to="/requirements"
            className="text-base font-bold text-primary hover:text-primary-hover"
          >
            See all services →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, i) => (
            <div
              key={service.code}
              className="group relative"
              onMouseEnter={() => setHoveredService(i)}
              onMouseLeave={() => setHoveredService(null)}
              onFocus={() => setHoveredService(i)}
              onBlur={() => setHoveredService(null)}
            >
              <Link
                to="/requirements"
                search={{ code: service.code }}
                className="civic-card block p-5 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    {service.icon}
                  </div>
                  <span className="text-[15px] font-semibold text-foreground">
                    {service.title}
                  </span>
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    hoveredService === i
                      ? "max-h-30 opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="mt-1 border-t border-border pt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      You'll need
                    </p>
                    <ul className="space-y-1.5">
                      {service.requirements.map((req) => (
                        <li
                          key={req}
                          className="flex items-start gap-2 text-[13px] leading-snug text-muted-foreground"
                        >
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <p
                  className={`text-[13px] font-semibold text-primary transition-opacity duration-200 ${
                    hoveredService === i ? "h-0 opacity-0" : "opacity-100"
                  }`}
                >
                  View requirements →
                </p>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
