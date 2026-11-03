import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { createLink } from "@tanstack/react-router";
import { cn } from "~/lib/utils";

/** Shared by routed links, hash links and file links throughout the UI. */
export const QuietAnchor = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<"a">
>(function QuietAnchor({ href, className, onClick, ...props }, ref) {
  const disabled =
    props["aria-disabled"] === true || props["aria-disabled"] === "true";

  return (
    <a
      ref={ref}
      // Keep the role and focus state owned by composed primitives such as
      // menu items rendered through `render={<QuietLink />}`.
      {...props}
      href={disabled ? undefined : href}
      className={cn("cursor-pointer", className)}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    />
  );
});

export const QuietLink = createLink(QuietAnchor);
