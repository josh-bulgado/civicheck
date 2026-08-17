import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Clock, Landmark, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { FeaturedChecklist } from "../landing.queries";
import { enterDelay, staggerStyle } from "~/components/motion/stagger";
import { cn } from "~/lib/utils";

const trustPoints = [
  { icon: Landmark, label: "Official CCRO service" },
  { icon: ShieldCheck, label: "Free to check requirements" },
  { icon: Clock, label: "No repeat trips" },
];

/** How long each checklist holds before the card turns over. */
const HOLD_MS = 5000;
/** Fade-out duration; the swap happens at the end of it. */
const FADE_MS = 340;

/**
 * Drive the hero card's turn-over.
 *
 * The rotation is decorative — it samples the catalogue for a visitor who has
 * not picked a document yet — so it yields to anything that suggests the
 * visitor is actually reading: a hover, a keyboard focus, or a
 * `prefers-reduced-motion` setting. It also stands down entirely when there is
 * only one checklist to show.
 */
const useChecklistRotation = (count: number) => {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Hold the current checklist, then start the fade. Re-running on `index`
  // restarts the clock for each slide; re-running on `paused` cancels a hold
  // in progress and gives the visitor a fresh full read when they leave.
  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;

    const hold = window.setTimeout(() => setFading(true), HOLD_MS);
    return () => window.clearTimeout(hold);
  }, [count, index, paused, reducedMotion]);

  // Swap at the bottom of the fade. Deliberately not gated on `paused`: a
  // pause landing mid-fade should finish the transition rather than strand the
  // card half faded out.
  useEffect(() => {
    if (!fading) return;

    const swap = window.setTimeout(() => {
      setIndex((current) => (current + 1) % count);
      setFading(false);
    }, FADE_MS);
    return () => window.clearTimeout(swap);
  }, [count, fading]);

  // Clamp rather than reset, so an admin editing the catalogue cannot leave the
  // card pointing past the end of the list.
  const safeIndex = count ? index % count : 0;

  return {
    index: safeIndex,
    fading,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
  };
};

const ChecklistCard = ({ checklists }: { checklists: FeaturedChecklist[] }) => {
  const { index, fading, pause, resume } = useChecklistRotation(checklists.length);
  const checklist = checklists[index];

  // Applied to every element whose text changes between slides, so the card
  // crossfades as one piece instead of each part flickering on its own.
  const swapClass = cn(
    "transition-[opacity,transform] duration-[340ms] ease-out",
    fading ? "-translate-y-1.5 opacity-0" : "translate-y-0 opacity-100",
  );

  return (
    <Link
      to="/requirements"
      search={{ code: checklist.linkCode }}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      className="civic-card group civic-interactive civic-lift block overflow-hidden shadow-[0_20px_48px_rgba(15,27,45,0.1)] hover:border-primary/30 hover:shadow-[0_24px_56px_rgba(15,27,45,0.14)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border-light bg-surface-subtle px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-2">
            Requirement checklist
          </p>
          {/* Two lines' worth of height reserved so a one-line service name
              does not make the whole card jump on the turn-over. */}
          <p
            className={cn(
              "mt-1 flex min-h-10.25 items-center text-[15px] font-bold leading-snug text-foreground",
              swapClass,
            )}
          >
            {checklist.displayName}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary",
            swapClass,
          )}
        >
          {checklist.totalCount} total
        </span>
      </div>

      <ol className={cn("flex min-h-46.5 flex-col gap-4 px-5 py-5", swapClass)}>
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
        <p className={cn("text-xs font-medium text-muted-2", swapClass)}>
          {checklist.remainingCount > 0
            ? `+ ${checklist.remainingCount} more requirements`
            : "Full checklist"}
        </p>

        {checklists.length > 1 ? (
          // Decorative: the card is one link, so these cannot be buttons
          // without nesting interactive elements. They mark position only.
          <span className="flex items-center gap-1.5" aria-hidden="true">
            {checklists.map((entry, i) => (
              <span
                key={entry.group}
                className={cn(
                  "h-1.25 rounded-full transition-[width,background-color] duration-300",
                  i === index ? "w-4 bg-primary" : "w-1.25 bg-border-strong",
                )}
              />
            ))}
          </span>
        ) : null}

        <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
          View all
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
};

const HeroSection = ({ checklists }: { checklists: FeaturedChecklist[] }) => {
  const hasChecklists = checklists.length > 0;

  return (
    <section className="civic-hero-backdrop overflow-hidden">
      <div
        className={cn(
          "civic-container grid grid-cols-1 items-center gap-12 py-16 md:py-24 lg:gap-14",
          hasChecklists && "lg:grid-cols-[1.12fr_0.88fr]",
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

        {hasChecklists ? (
          <div className="civic-enter" style={enterDelay(260)}>
            <ChecklistCard checklists={checklists} />
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default HeroSection;
