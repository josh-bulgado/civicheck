import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

const CtaBandSection = () => {
  return (
    <section className="bg-background">
      <div className="civic-container py-16 md:py-20">
        <div className="relative overflow-hidden rounded-2xl bg-panel-dark px-7 py-12 text-center sm:px-12 md:py-16">
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(38rem 20rem at 50% -20%, rgb(45 108 191 / 0.28), transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-3xl">
            <h2 className="civic-title text-[clamp(1.75rem,3.2vw,2.375rem)] leading-tight text-white">
              Find out what you need in under a minute
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-panel-dark-text">
              Pick your document, review the checklist, and walk into the CCRO
              with everything already in hand.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3.5">
              <Link
                to="/requirements"
                className="group inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-6 text-[15px] font-semibold text-foreground transition-colors hover:bg-primary-soft hover:text-primary"
              >
                Check my requirements
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/track"
                className="inline-flex min-h-12 items-center rounded-lg border border-white/25 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
              >
                Track an existing request
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBandSection;
