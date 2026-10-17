import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { createLink } from "@tanstack/react-router";
import { cn } from "~/lib/utils";

/**
 * The browser paints a "where does this go" bubble in the bottom-left corner
 * for any `<a href>` under the pointer, and nothing in CSS can suppress it. So
 * this anchor never gets an `href`: TanStack Router still navigates from the
 * `to` prop on click, but there's no URL for the browser to show.
 *
 * Without an `href` the element loses what the browser gave it for free, so it
 * gets those back by hand: the pointer cursor, a tab stop, and Enter to follow.
 * What can't be restored is anything that needs the URL itself: middle-click,
 * ctrl/cmd-click and "open in new tab". Keep plain `Link` anywhere those matter.
 */
const QuietAnchor = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<"a">>(
  function QuietAnchor({ href: _href, className, onKeyDown, ...props }, ref) {
    return (
      <a
        ref={ref}
        role="link"
        tabIndex={0}
        // Spread after the defaults so a parent that owns the role and focus
        // (a menu item rendered through `render={<QuietLink />}`) wins.
        {...props}
        className={cn("cursor-pointer", className)}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || event.key !== "Enter") return;
          event.currentTarget.click();
        }}
      />
    );
  },
);

export const QuietLink = createLink(QuietAnchor);
