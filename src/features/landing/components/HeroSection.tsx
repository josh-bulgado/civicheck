import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Clock, Landmark, ShieldCheck } from "lucide-react";
import type { FeaturedChecklist } from "../landing.queries";
import { enterDelay, staggerStyle } from "~/components/motion/stagger";
import { cn } from "~/lib/utils";

const trustPoints = [
  { icon: Landmark, label: "Official CCRO service" },
  { icon: ShieldCheck, label: "Free to check requirements" },
  { icon: Clock, label: "No repeat trips" },
];

const ChecklistCard = ({ checklist }: { checklist: FeaturedChecklist }) => (
  <Link
    to="/requirements"
    search={{ code: checklist.linkCode }}
    className="civic-card group civic-interactive civic-lift block overflow-hidden shadow-[0_20px_48px_rgba(15,27,45,0.1)] hover:border-primary/30 hover:shadow-[0_24px_56px_rgba(15,27,45,0.14)]"
  >
    <div className="flex items-start justify-between gap-3 border-b border-border-light bg-surface-subtle px-5 py-4">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-2">
          Requirement checklist
        </p>
        <p className="mt-1 text-[15px] font-bold leading-snug text-foreground">
          {checklist.displayName}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
        {checklist.totalCount} total
      </span>
    </div>

    <ol className="flex flex-col gap-4 px-5 py-5">
      {checklist.items.map((item, i) => (
        <li key={item.name} className="flex items-start gap-3">
          <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft font-mono text-[10px] font-bold text-primary">
            {i + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium leading-5 text-foreground">
              {item.name}
            </span>
            {item.source ? (
              <span className="mt-1 flex items-start gap-1.5 text-xs leading-4 text-muted-foreground">
                <Building2 className="mt-px size-3 shrink-0" />
                {item.source}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>

    <div className="flex items-center justify-between gap-3 border-t border-border-light bg-surface-subtle px-5 py-3.5">
      <p className="text-xs font-medium text-muted-2">
        {checklist.remainingCount > 0
          ? `+ ${checklist.remainingCount} more requirements`
          : "Full checklist"}
      </p>
      <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
        View all
        <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
      </span>
    </div>
  </Link>
);

const HeroSection = ({ checklist }: { checklist: FeaturedChecklist | null }) => {
  return (
    <section className="civic-hero-backdrop overflow-hidden">
      <div
        className={cn(
          "civic-container grid grid-cols-1 items-center gap-12 py-16 md:py-24 lg:gap-14",
          checklist && "lg:grid-cols-[1.12fr_0.88fr]",
        )}
      >
        {/* Above the fold, so this cascades in on load rather than on scroll. */}
        <div className="civic-stagger-auto flex flex-col gap-6">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            City Civil Registrar Office · Legazpi City
          </p>

          <h1 className="civic-title text-[clamp(2.125rem,3.9vw,3rem)] leading-[1.08]">
            Know what you need.
            <br />
            <span className="text-primary">Before you need it.</span>
          </h1>

          <p className="max-w-125 text-lg leading-relaxed text-body">
            CiviCheck shows you the exact requirements for your civil registry
            document — then tracks your request from submission to release. No
            more repeat trips to the CCRO.
          </p>

          <div className="flex flex-wrap gap-3.5 pt-1">
            <Link
              to="/requirements"
              className="group civic-press inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-6 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(11,77,162,0.22)] hover:bg-primary-hover hover:shadow-[0_10px_26px_rgba(11,77,162,0.3)]"
            >
              Check my requirements
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link
              to="/track"
              className="civic-press inline-flex min-h-12 items-center rounded-lg border border-control-border bg-white px-6 text-[15px] font-semibold text-foreground hover:border-primary/40 hover:text-primary"
            >
              Track an existing request
            </Link>
          </div>

          <ul className="civic-stagger flex flex-wrap items-center gap-x-6 gap-y-2.5 pt-3">
            {trustPoints.map(({ icon: Icon, label }, index) => (
              <li
                key={label}
                style={staggerStyle(index, 420)}
                className="flex items-center gap-2 text-[13px] font-medium text-muted-2"
              >
                <Icon className="size-4 text-primary/70" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {checklist ? (
          <div className="civic-enter" style={enterDelay(260)}>
            <ChecklistCard checklist={checklist} />
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default HeroSection;
