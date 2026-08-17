import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { cn } from "~/lib/utils";

/**
 * Shell shared by every auth screen: the form in the left column with the
 * office identity above it, and a fixed panel holding the right column.
 *
 * The form sits directly on the page rather than inside a card — with a solid
 * panel already owning half the screen, a second bordered surface only adds an
 * edge the eye has to cross before it reaches the first field.
 */
export function AuthSplitLayout({
  panel,
  children,
  className,
}: {
  /** Right column. Dropped below `lg`, where the form takes the full width. */
  panel: ReactNode;
  children: ReactNode;
  /** Form column width override — the default suits a single-column form. */
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh bg-card">
      <div className="flex flex-1 flex-col px-5 py-8 sm:px-10">
        <Link to="/" className="w-fit">
          <CiviCheckIdentity compact />
        </Link>

        <div
          className={cn(
            "mx-auto flex w-full max-w-88 flex-1 flex-col justify-center py-10",
            className,
          )}
        >
          {children}
        </div>
      </div>

      {/* Proportional rather than fixed: the panel holds a little under half the
          screen at every width, which is the balance the form column is sized
          against. Capped so it stops growing on very wide monitors. */}
      <div className="hidden shrink-0 lg:block lg:w-[42%] lg:max-w-190 xl:w-[45%]">
        {panel}
      </div>
    </div>
  );
}

/**
 * Auth fields run taller than the app default: these screens are the first
 * thing a resident touches, often on a phone, and the extra height keeps every
 * control comfortably above the 44px minimum hit target.
 */
export const authFieldClass = "h-11 rounded-lg px-3.5 text-sm shadow-none";

/**
 * Softly filled variant used on the create-account screen. With six controls
 * stacked in one column, a tint marks where each one starts more calmly than six
 * more outlines would; the fill clears on focus so the active field is obvious.
 */
export const authFilledFieldClass = `${authFieldClass} border-border-light bg-surface-subtle focus:bg-card disabled:bg-muted`;

/** Same treatment for a field that carries an inline control. */
export const authFilledGroupClass = `${authFieldClass} border-border-light bg-surface-subtle has-[[data-slot=input-group-control]:focus]:bg-card`;

/** Label metrics for the auth forms — one step down from the app default. */
export const authLabelClass = "text-[13px] font-medium text-body-strong";

/** Full-width action, matched to the field height above it. */
export const authButtonClass = "h-11 w-full rounded-lg text-[15px] font-semibold";

export function AuthFormHeading({
  title,
  description,
  className,
}: {
  title: string;
  /** Optional — omit where the fields below already say what the screen wants. */
  description?: string;
  /** Type-size override for the heading. */
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className={cn("civic-title text-[28px] leading-[1.15]", className)}>
        {title}
      </h1>
      {description ? (
        <p className="text-sm leading-snug text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Cross-link to the other auth screen, centred under the form. */
export function AuthFormFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-1.5 text-[13.5px] text-muted-foreground">
      {children}
    </div>
  );
}

/** Link styling for the cross-links and inline legal links on these screens. */
export const authLinkClass =
  "font-semibold text-primary underline underline-offset-2 hover:text-primary-hover";

/** Rule that separates the account action from the federated alternative. */
export function AuthFormDivider({ label = "Or" }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-3 text-[12.5px] text-muted-foreground"
      aria-hidden="true"
    >
      <span className="h-px flex-1 bg-border-lighter" />
      {label}
      <span className="h-px flex-1 bg-border-lighter" />
    </div>
  );
}
