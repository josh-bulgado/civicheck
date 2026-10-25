import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { createLink } from "@tanstack/react-router";
import { cn } from "~/lib/utils";

/** Activate native destinations without putting a hovered URL in browser chrome. */
function followDestination(
  href: string,
  options: Pick<
    ComponentPropsWithoutRef<"a">,
    "target" | "download" | "rel" | "referrerPolicy"
  >,
) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.hidden = true;
  if (options.target) anchor.target = options.target;
  anchor.rel = options.rel ?? "noopener noreferrer";
  if (options.referrerPolicy) anchor.referrerPolicy = options.referrerPolicy;
  if (options.download !== undefined && options.download !== false) {
    anchor.download = options.download === true ? "" : String(options.download);
  }
  anchor.addEventListener("click", (event) => event.stopPropagation());
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

/** Shared by routed links, hash links and file links throughout the UI. */
export const QuietAnchor = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<"a">
>(function QuietAnchor(
  {
    href,
    className,
    onKeyDown,
    onClick,
    onAuxClick,
    target,
    download,
    rel,
    referrerPolicy,
    ...props
  },
  ref,
) {
  const disabled =
    props["aria-disabled"] === true || props["aria-disabled"] === "true";
  function follow(newTab = false) {
    if (!href || disabled) return;
    followDestination(href, {
      target: newTab ? "_blank" : target,
      download,
      rel,
      referrerPolicy,
    });
  }
  return (
    <a
      ref={ref}
      role="link"
      tabIndex={0}
      // Spread after the defaults so a parent that owns the role and focus
      // (a menu item rendered through `render={<QuietLink />}`) wins.
      {...props}
      target={target}
      download={download}
      rel={rel}
      referrerPolicy={referrerPolicy}
      className={cn("cursor-pointer", className)}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
        // A routed link already handled ordinary clicks. Native destinations
        // and modified clicks still get their usual navigation behavior.
        if (event.defaultPrevented || event.button !== 0) return;
        event.preventDefault();
        follow(event.ctrlKey || event.metaKey || event.shiftKey);
      }}
      onAuxClick={(event) => {
        onAuxClick?.(event);
        if (event.defaultPrevented || event.button !== 1) return;
        event.preventDefault();
        follow(true);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== "Enter") return;
        event.preventDefault();
        if (event.ctrlKey || event.metaKey || event.shiftKey) follow(true);
        else event.currentTarget.click();
      }}
    />
  );
});

export const QuietLink = createLink(QuietAnchor);
