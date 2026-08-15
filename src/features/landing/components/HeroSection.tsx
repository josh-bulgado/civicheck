import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Baby, Heart, Gem, ScrollText, ChevronRight } from "lucide-react";

const services = [
  {
    icon: <Baby className="w-5 h-5" />,
    title: "Birth Certificate",
    code: "BIRTH_ONTIME",
    requirements: [
      "Certificate of Live Birth (PSA or local)",
      "Valid ID of requesting party",
      "Authorization letter (if representative)",
    ],
  },
  {
    icon: <Gem className="w-5 h-5" />,
    title: "Marriage Certificate",
    code: "MARRIAGE_ONTIME",
    requirements: [
      "Certificate of Marriage (PSA or local)",
      "Valid IDs of contracting parties",
      "Marriage License",
    ],
  },
  {
    icon: <Heart className="w-5 h-5" />,
    title: "Death Certificate",
    code: "DEATH_ONTIME",
    requirements: [
      "Certificate of Death (PSA or local)",
      "Valid ID of informant",
      "Burial permit",
    ],
  },
  {
    icon: <ScrollText className="w-5 h-5" />,
    title: "Certified True Copy",
    code: "CTC_ISSUANCE",
    requirements: [
      "Original registered document on file",
      "Valid ID of requesting party",
      "Notarized affidavit (if needed)",
    ],
  },
];

const HeroSection = () => {
  const [hoveredService, setHoveredService] = useState<number | null>(null);

  return (
    <section className="bg-background" id="services">
      <div className="civic-container pb-20 pt-16 md:pb-24 md:pt-20">
        {/* Eyebrow */}
        <p className="civic-eyebrow mb-5">
          City Civil Registrar Office · Legazpi City
        </p>

        {/* Headline */}
        <h1
          className="civic-title mb-6 max-w-[720px] text-[clamp(2.25rem,5vw,4rem)] leading-[1.05]"
        >
          Know What You Need.
          <br />
          Before You Need It.
        </h1>

        {/* Subheadline */}
        <p className="mb-10 max-w-[600px] text-[17px] leading-relaxed text-muted-foreground">
          CiviCheck shows you the exact requirements for your civil registry
          document — then tracks your request from submission to release.
          No more repeat trips to the CCRO.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 mb-16">
          <Link
            to="/requirements"
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Check my requirements
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            search={{ redirect: "/dashboard" }}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border bg-white px-6 py-3 text-[15px] font-semibold text-foreground transition-colors hover:border-primary/35 hover:bg-primary-soft"
          >
            Track an existing request
          </Link>
        </div>

        {/* Service Cards — The Signature Element */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {services.map((service, i) => (
            <div
              key={service.title}
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
                tabIndex={0}
              >

                {/* Card header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    {service.icon}
                  </div>
                  <span className="text-[15px] font-semibold text-foreground">
                    {service.title}
                  </span>
                </div>

                {/* Requirement preview — visible on hover */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    hoveredService === i
                      ? "max-h-[120px] opacity-100"
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

                {/* Static label when not hovered */}
                <p
                  className={`text-[13px] font-semibold text-primary transition-opacity duration-200 ${
                    hoveredService === i ? "opacity-0 h-0" : "opacity-100"
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

export default HeroSection;
