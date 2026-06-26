import { Baby, Gem, Heart, ScrollText } from "lucide-react";

const ServicesSection = () => {
  const services = [
    {
      icon: <Baby className="w-8 h-8" />,
      title: "Birth Certificate",
      desc: "Request a copy of a birth certificate registered with the CCRO.",
      bgColor: "#e8f5ff",
    },
    {
      icon: <Gem className="w-8 h-8" />,
      title: "Marriage Certificate",
      desc: "Request a copy of a marriage certificate registered with the CCRO.",
      bgColor: "#fff3e0",
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Death Certificate",
      desc: "Request a copy of a death certificate registered with the CCRO.",
      bgColor: "#f1f1f1",
    },
    {
      icon: <ScrollText className="w-8 h-8" />,
      title: "Certified True Copy (CTC)",
      desc: "Request a certified true copy of a civil registry document on file.",
      bgColor: "#e8f5e9",
    },
  ];

  return (
    <section className="bg-[#f1f1f1] border-t border-gray-200">
      <div className="max-w-[1200px] mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-[28px] font-bold text-[#1b1b1b] inline-block relative pb-3">
            Services offered
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#d4a017]" />
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 px-4">
          {services.map((service) => (
            <a
              key={service.title}
              href="#"
              className="bg-white border border-gray-200 rounded overflow-hidden hover:shadow-md transition-shadow block group"
            >
              {/* Icon area */}
              <div
                className="h-[140px] flex items-center justify-center"
                style={{ backgroundColor: service.bgColor }}
              >
                <div className="text-center p-4">
                  <div className="w-14 h-14 mx-auto bg-[#003366]/10 rounded-lg flex items-center justify-center">
                    <div className="text-[#003366]">{service.icon}</div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[15px] text-[#1b1b1b] mb-2 leading-snug group-hover:text-[#205493] transition-colors">
                  {service.title}
                </h3>
                <p className="text-[13px] text-[#5b616b] mb-3 leading-relaxed">
                  {service.desc}
                </p>
                <span className="text-sm text-[#205493] hover:underline">
                  Check requirements →
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
