import type { ReactNode } from "react";
import { QuietLink as Link } from "~/components/quiet-link";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { enterDelay } from "~/components/motion/stagger";
import { ThemeSwitch } from "~/components/theme-switch";
import { buttonVariants } from "~/components/ui/button";
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
    <div className="auth-scope flex min-h-dvh bg-(--auth-bg)">
      <div className="flex flex-1 flex-col px-5 py-8 sm:px-10">
        <div className="civic-enter-fade flex items-center justify-between">
          <Link to="/" className="w-fit">
            <CiviCheckIdentity compact />
          </Link>
          <ThemeSwitch />
        </div>

        <div
          className={cn(
            "civic-enter mx-auto flex w-full max-w-88 flex-1 flex-col justify-center py-10",
            className,
          )}
        >
          {children}
        </div>
      </div>

      {/* Keep the panel within the viewport while the longer form scrolls.
          Its width stays proportional and is capped on very wide monitors. */}
      <div
        className="civic-enter-fade hidden shrink-0 lg:sticky lg:top-0 lg:block lg:h-dvh lg:w-[42%] lg:max-w-190 lg:self-start xl:w-[45%]"
        style={enterDelay(120)}
      >
        {panel}
      </div>
    </div>
  );
}

/**
 * Shell for an auth step that stands on its own — one short task, nothing to
 * sell — so it drops the panel and centres a single column under the same
 * office identity.
 */
export function AuthCenteredLayout({
  children,
  className,
}: {
  children: ReactNode;
  /** Column width override. */
  className?: string;
}) {
  return (
    <div className="auth-scope flex min-h-dvh flex-col bg-(--auth-bg) px-5 py-8 sm:px-10">
      <div className="civic-enter-fade flex items-center justify-between">
        <Link to="/" className="w-fit">
          <CiviCheckIdentity compact />
        </Link>
        <ThemeSwitch />
      </div>

      <div
        className={cn(
          "civic-enter mx-auto flex w-full max-w-85 flex-1 flex-col justify-center py-10",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Pill at the top of a standalone auth step that returns to the screen before it. */
export function AuthBackLink({
  to,
  children,
}: {
  to: "/login" | "/signup";
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "group w-fit rounded-full border-border-light bg-card px-3.5 text-[13px] font-semibold text-foreground hover:bg-surface-subtle",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Heading for a standalone auth step. The description takes rich content so
 * the address the step is about can be set in bold, and sits in the body ink
 * rather than the muted grey of the split-screen headings.
 */
export function AuthStepHeading({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="civic-title text-[28px] leading-[1.15]">{title}</h1>
      <p className="text-sm leading-snug text-body">{children}</p>
    </div>
  );
}

/** An email address inside running text — bold, and free to break if it is long. */
export function AuthEmphasis({ children }: { children: ReactNode }) {
  return (
    <strong className="font-semibold wrap-break-word text-foreground">
      {children}
    </strong>
  );
}

/**
 * Auth fields run taller than the app default: these screens are the first
 * thing a resident touches, often on a phone, and the extra height keeps every
 * control comfortably above the 44px minimum hit target. The pill shape is
 * shared by every auth input and select.
 */
export const authFieldClass = "h-11 rounded-full px-3.5 text-sm shadow-none";

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

/** Heavier label for the standalone steps, where it is the only text over a lone field. */
export const authStepLabelClass = "text-[13px] font-semibold text-foreground";

/** Full-width pill action, matched to the field height above it. */
export const authButtonClass =
  "h-11 w-full rounded-full text-[15px] font-semibold";

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
