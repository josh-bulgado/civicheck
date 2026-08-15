import { Link } from "@tanstack/react-router";
import { cn } from "~/lib/utils";

type ImageSlotProps = {
  caption: string;
  className?: string;
};

const ImageSlot = ({ caption, className }: ImageSlotProps) => (
  <div
    className={cn(
      "flex items-end overflow-hidden rounded-xl border border-border p-4",
      className,
    )}
    style={{
      backgroundImage:
        "repeating-linear-gradient(135deg, var(--border-light), var(--border-light) 10px, var(--border-lighter) 10px, var(--border-lighter) 20px)",
    }}
  >
    <p className="font-mono text-xs leading-snug text-muted-2">{caption}</p>
  </div>
);

const HeroSection = () => {
  return (
    <section className="bg-background">
      <div className="civic-container grid grid-cols-1 items-center gap-12 py-16 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div className="flex flex-col gap-6">
          <p className="civic-eyebrow mb-0">
            City Civil Registrar Office · Legazpi City
          </p>

          <h1 className="civic-title text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05]">
            Know what you need.
            <br />
            Before you need it.
          </h1>

          <p className="max-w-140 text-xl leading-relaxed text-body">
            CiviCheck shows you the exact requirements for your civil
            registry document — then tracks your request from submission to
            release. No more repeat trips to the CCRO.
          </p>

          <div className="flex flex-wrap gap-3.5 pt-2">
            <Link
              to="/requirements"
              className="inline-flex min-h-12 items-center rounded-lg bg-primary px-6 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Check my requirements
            </Link>
            <Link
              to="/track"
              className="inline-flex min-h-12 items-center rounded-lg border border-control-border bg-white px-6 text-[15px] font-semibold text-foreground transition-colors hover:border-dashed-border hover:bg-background"
            >
              Track an existing request
            </Link>
          </div>

          <p className="flex flex-wrap items-center gap-5.5 text-[15px] text-body">
            <span>Office hours and address — to be confirmed with CCRO</span>
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <ImageSlot
            caption="CCRO service window — citizens being assisted, ~1200×800"
            className="h-75"
          />
          <div className="grid grid-cols-2 gap-4">
            <ImageSlot caption="Queue display board" className="h-35" />
            <ImageSlot
              caption="Citizen holding a released document"
              className="h-35"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
