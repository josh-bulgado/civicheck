import { Link } from "@tanstack/react-router";

const previewSlots = [
  { label: "Morning", time: "8:00 AM – 12:00 PM" },
  { label: "Afternoon", time: "1:00 PM – 5:00 PM" },
];

const QueueTeaserSection = () => {
  return (
    <section className="border-b border-border-light bg-background">
      <div className="civic-container civic-section grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <p className="civic-eyebrow-rule mb-0">Visit scheduling</p>
          <h2 className="civic-title text-[clamp(1.75rem,3vw,2.125rem)] leading-tight">
            Book a slot before you visit
          </h2>
          <p className="max-w-[480px] text-lg leading-relaxed text-body">
            Pick a morning or afternoon slot for your CCRO visit and see your
            upcoming appointments — all before you leave the house.
          </p>
          <Link
            to="/appointments"
            className="inline-flex min-h-12 w-fit items-center rounded-lg bg-primary px-6 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Book a visit slot
          </Link>
        </div>

        <div className="flex flex-col gap-[22px] rounded-xl bg-panel-dark p-8">
          <p className="text-[15px] font-bold uppercase tracking-widest text-panel-dark-muted">
            Available slots today
          </p>

          <div className="flex flex-col gap-3">
            {previewSlots.map((slot) => (
              <div
                key={slot.label}
                className="flex items-center justify-between rounded-lg bg-panel-dark-row px-5 py-4.5"
              >
                <p className="text-[17px] font-bold text-white">{slot.label}</p>
                <p className="text-[15px] text-panel-dark-text">{slot.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default QueueTeaserSection;
