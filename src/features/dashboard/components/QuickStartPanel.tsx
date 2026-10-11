import { Link } from "@tanstack/react-router";
import { Baby, Gem, Heart, ScrollText } from "lucide-react";
import { staggerStyle } from "~/components/motion/stagger";
import { pillButton } from "~/components/portal/styles";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const QUICK_SERVICES = [
  { icon: Baby, label: "Birth Certificate", note: "Local civil registry copy" },
  { icon: Gem, label: "Marriage Certificate", note: "Certified copy of record" },
  { icon: Heart, label: "Death Certificate", note: "For estate or claims" },
  { icon: ScrollText, label: "Certified True Copy", note: "Of any registry document" },
] as const;

const TILE =
  "civic-interactive border border-border text-foreground hover:border-primary hover:bg-primary-tint";
const TEXT_LINK = "text-sm font-bold text-primary hover:text-primary-hover";

interface QuickStartPanelProps {
  /** The whole dashboard for an applicant with no requests yet. */
  prominent?: boolean;
}

export function QuickStartPanel({ prominent = false }: QuickStartPanelProps) {
  if (prominent) {
    return (
      <section className="portal-card flex flex-col gap-7 px-5 pt-7 pb-6 sm:px-10 sm:pt-10 sm:pb-8">
        <div className="flex flex-wrap items-end gap-6">
          <div className="mr-auto flex max-w-155 flex-col gap-2">
            <h1 className="portal-title">What are you here for?</h1>
            <p className="text-[15px] leading-[1.55] text-muted-foreground text-pretty">
              Let's find out what you need. Pick a document below to see its checklist,
              then submit your request when you're ready.
            </p>
          </div>
          <Link to="/services" className={cn(buttonVariants(), pillButton.primary)}>
            Check requirements
          </Link>
        </div>
        <div className="civic-stagger grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3">
          {QUICK_SERVICES.map(({ icon: Icon, label, note }, index) => (
            <Link
              key={label}
              to="/services"
              style={staggerStyle(index)}
              className={`${TILE} flex flex-col gap-7 rounded-[14px] p-5`}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="size-5.5" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-base font-bold">{label}</span>
                <span className="text-[13px] text-muted-foreground">{note}</span>
              </span>
            </Link>
          ))}
        </div>
        <Link to="/services" className={`${TEXT_LINK} self-start`}>
          View all services →
        </Link>
      </section>
    );
  }

  return (
    <section className="portal-card flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-7">
      <div className="flex flex-col gap-1.5">
        <p className="portal-eyebrow">Quick start</p>
        <h2 className="portal-heading">Start a new request</h2>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {QUICK_SERVICES.map(({ icon: Icon, label }) => (
          <Link
            key={label}
            to="/services"
            className={`${TILE} flex min-h-15 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            {label}
          </Link>
        ))}
      </div>
      <Link to="/services" className={`${TEXT_LINK} self-start`}>
        View all services →
      </Link>
    </section>
  );
}
