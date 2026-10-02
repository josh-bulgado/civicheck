import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { ArrowRight, BadgeCheck, BellRing, HandHeart, ListChecks, Send, X, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { clearCurrentUser } from "~/features/auth/current-user";
import { markWelcomeTutorialSeenFn } from "../onboarding.mutations";

const OPEN_EVENT = "civicheck:open-tutorial";

// Lets the dashboard finish drawing first, so the tutorial reads as arriving
// on top of it rather than flashing in mid-load.
const AUTO_OPEN_DELAY_MS = 450;

// Guards against a second automatic open in the same page load: the cached
// profile can still say "not seen" until the save below lands.
let autoOpened = false;

/** Call from anywhere (e.g. a "How it works" button) to open the tutorial. */
export function openWelcomeTutorial() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/**
 * Opens the tutorial automatically one time only: the first time an applicant
 * with no requests reaches the dashboard. It is marked seen as soon as it
 * opens, so it never opens on its own again on any device. "How it works"
 * still reopens it.
 */
export function useWelcomeTutorialAutoOpen({ hasRequests, seen }: { hasRequests: boolean; seen: boolean }) {
  useEffect(() => {
    if (hasRequests || seen || autoOpened) return;
    const timer = window.setTimeout(() => {
      autoOpened = true;
      openWelcomeTutorial();
      void markWelcomeTutorialSeenFn()
        .then(() => clearCurrentUser())
        .catch(() => {});
    }, AUTO_OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [hasRequests, seen]);
}

interface Slide {
  kicker: string;
  title: string;
  body: string;
  icon: LucideIcon;
  hue: number;
}

const SLIDES: Slide[] = [
  { kicker: "Welcome", title: "Welcome to CiviCheck", body: "Request your civil registry documents from the City Civil Registrar Office. This short guide shows you how, in 4 easy steps.", icon: HandHeart, hue: 255 },
  { kicker: "Step 1 of 4", title: "Check the requirements", body: "Choose the document you need. We show you the list of papers to bring, the fee, and how long it takes.", icon: ListChecks, hue: 160 },
  { kicker: "Step 2 of 4", title: "Submit your request online", body: "Fill in a simple form from your phone or computer. Attaching photos of your papers is optional.", icon: Send, hue: 245 },
  { kicker: "Step 3 of 4", title: "Track your request", body: "CCRO staff check your papers. You can see your status anytime, and we will notify you if something is missing.", icon: BellRing, hue: 295 },
  { kicker: "Step 4 of 4", title: "Pay and claim at the CCRO", body: "When your document is ready, go to the CCRO cashier, pay the fee, and take home your document.", icon: BadgeCheck, hue: 70 },
];

const tone = (h: number) => ({
  soft: `oklch(0.955 0.03 ${h})`,
  ring: `oklch(0.9 0.05 ${h} / 0.6)`,
  ink: `oklch(0.48 0.12 ${h})`,
});

// Entrance choreography once the card lands: icon, then the text lines one by
// one, then the controls. Uses the app's civic-enter classes, which already
// collapse to instant under prefers-reduced-motion.
const ICON_ENTER = { "--enter-delay": "140ms" } as CSSProperties;
const TEXT_ENTER = { "--stagger-base": "200ms" } as CSSProperties;
const CONTROLS_ENTER = { "--enter-delay": "320ms" } as CSSProperties;

/** The tutorial dialog. Mounted once in the dashboard layout so "How it works" works on every page. */
export function WelcomeTutorial() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const show = () => {
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setIndex(0);
  }, []);

  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;

  const next = () => (isLast ? close() : setIndex((i) => i + 1));
  const back = () => (isFirst ? close() : setIndex((i) => i - 1));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto overflow-x-hidden rounded-[20px] p-0 shadow-[0_24px_60px_rgba(15,27,45,0.3)] sm:max-w-[580px] data-open:slide-in-from-bottom-8 data-open:duration-(--duration-slow) data-open:ease-(--ease-civic-emphasized) motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close tutorial"
          className="absolute top-3.5 right-3.5 z-10 flex size-11 items-center justify-center rounded-full bg-white/85 text-body-strong transition-colors hover:bg-white"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-[380ms] ease-[cubic-bezier(.22,.61,.36,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {SLIDES.map((slide, i) => {
              const t = tone(slide.hue);
              const Icon = slide.icon;
              return (
                <div key={slide.title} className="min-w-0 flex-[0_0_100%]" aria-hidden={i !== index}>
                  <div
                    className="relative flex h-[clamp(120px,26vh,220px)] items-center justify-center overflow-hidden"
                    style={{ background: t.soft }}
                  >
                    <span className="absolute -bottom-[70px] -left-10 size-[200px] rounded-full border-[32px]" style={{ borderColor: t.ring }} />
                    <span className="absolute -top-[50px] -right-[30px] size-[140px] rounded-full border-[22px]" style={{ borderColor: t.ring }} />
                    <span
                      className="civic-enter-scale relative flex size-[104px] items-center justify-center rounded-[28px] bg-white shadow-[0_12px_28px_-12px_rgba(15,27,45,0.35)]"
                      style={{ color: t.ink, ...ICON_ENTER }}
                    >
                      <Icon className="size-[52px]" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="civic-stagger-auto px-9 pt-7 pb-2 text-center" style={TEXT_ENTER}>
                    <p className="mb-2.5 text-sm font-bold uppercase tracking-[0.1em]" style={{ color: t.ink }}>
                      {slide.kicker}
                    </p>
                    {i === index ? (
                      <>
                        <DialogTitle className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-foreground text-balance">
                          {slide.title}
                        </DialogTitle>
                        <DialogDescription className="mx-auto mt-3.5 max-w-[440px] text-lg leading-relaxed text-body-strong text-pretty">
                          {slide.body}
                        </DialogDescription>
                      </>
                    ) : (
                      <>
                        <p className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-foreground text-balance">{slide.title}</p>
                        <p className="mx-auto mt-3.5 max-w-[440px] text-lg leading-relaxed text-body-strong text-pretty">{slide.body}</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="civic-enter-fade" style={CONTROLS_ENTER}>
          <div className="flex justify-center gap-2 pt-5 pb-1" role="tablist" aria-label="Tutorial slides">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.title}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={slide.title}
                onClick={() => setIndex(i)}
                className="flex h-6 items-center px-0.5"
              >
                <span
                  className={cn(
                    "block h-2.5 rounded-full transition-[width,background-color] duration-200",
                    i === index ? "w-7 bg-primary" : "w-2.5 bg-border-strong",
                  )}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 px-7 pt-4 pb-6">
            <Button type="button" variant="ghost" onClick={back} className="h-13 px-4.5 text-[17px] font-semibold">
              {isFirst ? "Skip" : "Back"}
            </Button>
            <Button type="button" onClick={next} className="h-13 gap-2 px-5.5 text-[17px] font-bold">
              {isFirst ? "Show me" : isLast ? "Find my document" : "Next"}
              <ArrowRight className="size-[18px]" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
