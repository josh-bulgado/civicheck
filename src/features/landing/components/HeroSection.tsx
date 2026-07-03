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
    <section className="bg-ash" id="services">
      <div className="max-w-[1120px] mx-auto px-5 pt-16 pb-20 md:pt-24 md:pb-28">
        {/* Eyebrow */}
        <p className="text-[13px] font-medium tracking-widest uppercase text-slate mb-5">
          City Civil Registrar Office · Legazpi City
        </p>

        {/* Headline */}
        <h1
          className="font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] text-basalt max-w-[640px] mb-6"
        >
          Know What You Need.
          <br />
          Before You Need It.
        </h1>

        {/* Subheadline */}
        <p className="text-[17px] leading-relaxed text-slate max-w-[540px] mb-10">
          CiviCheck shows you the exact requirements for your civil registry
          document — then tracks your request from submission to release.
          No more repeat trips to the CCRO.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 mb-16">
          <Link
            to="/requirements"
            className="inline-flex items-center gap-2 bg-lagoon hover:bg-[#0D5E53] text-white font-semibold text-[15px] px-6 py-3 rounded-lg transition-colors"
          >
            Check my requirements
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            search={{ redirect: "/dashboard" }}
            className="inline-flex items-center gap-2 border-2 border-basalt/15 text-basalt font-semibold text-[15px] px-6 py-3 rounded-lg hover:border-basalt/30 hover:bg-white transition-colors"
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
                className="block bg-white border border-basalt/8 rounded-lg p-5 hover:border-lagoon/30 hover:shadow-md transition-all"
                tabIndex={0}
              >

                {/* Card header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-md bg-lagoon-light flex items-center justify-center text-lagoon shrink-0">
                    {service.icon}
                  </div>
                  <span className="font-semibold text-[15px] text-basalt">
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
                  <div className="border-t border-basalt/8 pt-3 mt-1">
                    <p className="text-[11px] font-semibold tracking-wider uppercase text-slate mb-2">
                      You'll need
                    </p>
                    <ul className="space-y-1.5">
                      {service.requirements.map((req) => (
                        <li
                          key={req}
                          className="text-[13px] text-slate leading-snug flex items-start gap-2"
                        >
                          <span className="w-1 h-1 rounded-full bg-lagoon mt-1.5 shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Static label when not hovered */}
                <p
                  className={`text-[13px] text-lagoon font-medium transition-opacity duration-200 ${
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
