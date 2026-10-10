import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  CityGovernmentIdentity,
  CiviCheckIdentity,
} from "~/components/brand/civic-identity";
import { enterDelay } from "~/components/motion/stagger";
import { buttonVariants } from "~/components/ui/button";
import type { AccountProfile } from "~/features/account/account.types";
import { cn } from "~/lib/utils";

type Tone = "info" | "warning" | "danger" | "neutral";

/**
 * One tone per kind of problem, drawn from the existing status tokens so the
 * pages read as the same system as the rest of the app: blue for "this isn't
 * here", gold for "not for you", red for "we broke something", slate for "you
 * lost your connection".
 */
const TONES: Record<
  Tone,
  { bar: string; icon: string; code: string; dot: string }
> = {
  info: {
    bar: "bg-primary",
    icon: "border-primary/15 bg-primary-soft text-primary",
    code: "text-primary/[0.09]",
    dot: "bg-primary",
  },
  warning: {
    bar: "bg-brand-gold",
    icon: "border-warning-border bg-warning-soft text-warning-strong",
    code: "text-brand-gold/30",
    dot: "bg-warning",
  },
  danger: {
    bar: "bg-brand-red",
    icon: "border-health-error-border bg-health-error-bg text-health-error-fg",
    code: "text-brand-red/[0.09]",
    dot: "bg-health-error-dot",
  },
  neutral: {
    bar: "bg-health-neutral-dot",
    icon: "border-health-neutral-border bg-health-neutral-bg text-health-neutral-fg",
    code: "text-health-neutral-dot/15",
    dot: "bg-health-neutral-dot",
  },
};

/** Shared by every action so they hold the same 44px touch target as auth. */
export const errorActionClass =
  "h-11 w-full rounded-lg px-5 text-[15px] font-semibold sm:w-auto";

export function errorLinkClass(variant: "default" | "outline" = "default") {
  return cn(buttonVariants({ variant }), errorActionClass);
}

/**
 * The signed-in user as far as the root route has resolved them. Read from the
 * router state rather than `useRouteContext` because these pages also render
 * when the root route's own `beforeLoad` is what failed — at which point there
 * is no context to read, and a hook that throws would take the error page down
 * with it.
 */
export function useErrorPageUser(): AccountProfile | null {
  return useRouterState({
    select: (state) => {
      const context = state.matches[0]?.context as
        | { user?: AccountProfile | null }
        | undefined;
      return context?.user ?? null;
    },
  });
}

/**
 * Full-screen shell for the "something stopped you" pages — not found,
 * forbidden, crashed, offline. Same bones as the auth screens (office identity
 * top-left, city identity at the foot) around a single document-style card, so
 * a resident who lands here still knows they are on the CCRO's site.
 */
export function ErrorPageLayout({
  tone,
  code,
  icon: Icon,
  eyebrow,
  title,
  description,
  detail,
  actions,
  aside,
  announce = false,
}: {
  tone: Tone;
  /** Large numeral behind the card, e.g. `404`. Omit when there isn't one. */
  code?: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: ReactNode;
  /** A small monospace line under the copy, e.g. the address that failed. */
  detail?: { label: string; value: string };
  actions: ReactNode;
  /** Optional block under the card — suggested next steps. */
  aside?: ReactNode;
  /** Announce the message to screen readers as soon as the page renders. */
  announce?: boolean;
}) {
  const palette = TONES[tone];

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background">
      {/* A soft wash of the brand blue from the top edge — enough to lift the
          page off flat grey without competing with the card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-112 bg-[radial-gradient(56rem_22rem_at_50%_-6rem,color-mix(in_srgb,var(--primary)_10%,transparent),transparent)]"
      />

      <header className="px-5 py-6 sm:px-10">
        <Link to="/" className="civic-enter-fade inline-block w-fit">
          <CiviCheckIdentity compact />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 pt-0 pb-10 sm:px-10">
        <div className="w-full max-w-xl">
          {code ? (
            <p
              aria-hidden="true"
              className={cn(
                "civic-enter-fade text-center text-[clamp(5rem,17vw,8rem)] leading-none font-extrabold tracking-[-0.06em] tabular-nums select-none",
                palette.code,
              )}
            >
              {code}
            </p>
          ) : null}

          <section
            role={announce ? "alert" : undefined}
            aria-labelledby="error-page-title"
            className={cn(
              "civic-enter relative overflow-hidden rounded-2xl border border-border bg-card px-6 pt-9 pb-7 text-center shadow-sm sm:px-10",
              code && "-mt-5",
            )}
            style={enterDelay(60)}
          >
            {/* Letterhead rule across the top of the card. */}
            <span
              aria-hidden="true"
              className={cn("absolute inset-x-0 top-0 h-1", palette.bar)}
            />

            <span
              aria-hidden="true"
              className={cn(
                "mx-auto flex size-14 items-center justify-center rounded-2xl border",
                palette.icon,
              )}
            >
              <Icon className="size-7" strokeWidth={1.75} />
            </span>

            <p className="mt-5 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
            <h1
              id="error-page-title"
              className="mt-2 text-[26px] leading-tight font-bold tracking-[-0.02em] text-balance text-foreground sm:text-[30px]"
            >
              {title}
            </h1>
            <div className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-relaxed text-pretty text-body">
              {description}
            </div>

            {detail ? (
              <dl className="mx-auto mt-5 max-w-full rounded-lg border border-border-light bg-surface-subtle px-4 py-2.5 text-left">
                <dt className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  {detail.label}
                </dt>
                <dd className="mt-0.5 font-mono text-[13px] break-all text-body-strong">
                  {detail.value}
                </dd>
              </dl>
            ) : null}

            <div className="mt-7 flex flex-col-reverse items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
              {actions}
            </div>
          </section>

          {aside ? (
            <div className="civic-enter mt-5" style={enterDelay(160)}>
              {aside}
            </div>
          ) : null}
        </div>
      </main>

      <footer className="border-t border-border-light bg-card/60 px-5 py-5 sm:px-10">
        <div className="mx-auto flex max-w-xl flex-col items-center justify-between gap-3 sm:flex-row">
          <CityGovernmentIdentity compact />
          <p className="text-center text-xs text-muted-foreground sm:text-right">
            City Civil Registrar Office · City Government of Legazpi
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Pulsing dot used for "waiting on the connection"-style status lines. */
export function StatusDot({
  tone,
  pulse = false,
}: {
  tone: Tone;
  pulse?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 rounded-full",
        TONES[tone].dot,
        pulse && "animate-pulse motion-reduce:animate-none",
      )}
    />
  );
}
