import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { cn } from "~/lib/utils";

/**
 * Shell shared by the sign-in and create-account screens: the dark brand panel
 * on the left, the form anchored in a card on a tinted field to its right.
 *
 * The card is what balances the two columns — a bare form floating on a flat
 * background reads as unfinished next to a solid panel, and gives the eye no
 * edge to land on.
 */
export function AuthCardLayout({
  panel,
  children,
  footnote,
  className,
}: {
  panel: ReactNode;
  /** Card contents. */
  children: ReactNode;
  /** Small print rendered under the card, outside it. */
  footnote?: ReactNode;
  /** Card column width override — the default suits a single-column form. */
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh bg-workspace">
      {panel}

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-12 sm:px-10">
        <Link to="/" className="inline-flex lg:hidden">
          <CiviCheckIdentity />
        </Link>

        <div className={cn("flex w-full max-w-108 flex-col gap-3.5", className)}>
          <div className="rounded-xl border border-border-light bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_14px_34px_-18px_rgba(16,24,40,0.22)]">
            {children}
          </div>

          {footnote ? (
            <p className="text-center text-[13px] leading-relaxed text-pretty text-muted-foreground">
              {footnote}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AuthCardHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h1 className="civic-title text-2xl">{title}</h1>
      <p className="text-[15px] leading-snug text-muted-2">{description}</p>
    </div>
  );
}

/** Cross-link to the other auth screen, ruled off from the form above it. */
export function AuthCardFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-1.5 border-t border-border-lighter pt-4 text-[15px] text-body">
      {children}
    </div>
  );
}
