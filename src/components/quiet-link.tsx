import {
  forwardRef,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
} from "react";
import { createLink } from "@tanstack/react-router";
import { cn } from "~/lib/utils";

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function isNavigableHref(href: string) {
  try {
    const protocol = new URL(href, document.baseURI).protocol;
    // Programmatic activation must retain React's protection against script URLs.
    return protocol !== "javascript:" && protocol !== "vbscript:";
  } catch {
    return false;
  }
}

/** Activate a destination without making the hovered element a native link. */
function followDestination(
  element: HTMLAnchorElement,
  href: string,
  newTab: boolean,
) {
  if (!isNavigableHref(href)) return;
  const link = element.cloneNode(false) as HTMLAnchorElement;
  link.removeAttribute("id");
  link.setAttribute("href", href);
  link.hidden = true;
  link.setAttribute("aria-hidden", "true");
  link.tabIndex = -1;
  if (newTab) {
    link.target = "_blank";
    link.rel = `${link.rel} noopener`.trim();
  }
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
  }
}

/** Shared by routed links, hash links and file links throughout the UI. */
export const QuietAnchor = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<"a">
>(function QuietAnchor(
  {
    href,
    className,
    onClick,
    onAuxClick,
    onKeyDown,
    onContextMenu,
    role,
    tabIndex,
    ...props
  },
  ref,
) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientSnapshot,
    serverSnapshot,
  );
  const disabled =
    props["aria-disabled"] === true || props["aria-disabled"] === "true";

  return (
    <a
      ref={ref}
      // Keep the role and focus state owned by composed primitives such as
      // menu items rendered through `render={<QuietLink />}`.
      {...props}
      // Retain native destinations for SSR/no-JS navigation. Once hydrated,
      // navigation is handled below so hovering cannot show a destination URL.
      href={disabled || hydrated ? undefined : href}
      role={role ?? (href !== undefined ? "link" : undefined)}
      tabIndex={
        tabIndex ?? (disabled ? -1 : href !== undefined ? 0 : undefined)
      }
      className={cn("cursor-pointer", className)}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
        // TanStack handles ordinary routed clicks and prevents their default.
        // Plain anchors, downloads, and modified clicks retain native behavior
        // through an unhovered, temporary anchor with the same attributes.
        if (!event.defaultPrevented && href !== undefined) {
          event.preventDefault();
          followDestination(
            event.currentTarget,
            href,
            event.ctrlKey || event.metaKey || event.shiftKey,
          );
        }
      }}
      onAuxClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onAuxClick?.(event);
        if (
          !event.defaultPrevented &&
          event.button === 1 &&
          href !== undefined
        ) {
          event.preventDefault();
          followDestination(event.currentTarget, href, true);
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== "Enter") return;
        event.preventDefault();
        if (disabled) return;
        event.currentTarget.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
          }),
        );
      }}
      onContextMenu={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onContextMenu?.(event);
        if (
          event.defaultPrevented ||
          href === undefined ||
          !isNavigableHref(href)
        )
          return;
        // Let the browser build its normal link menu (copy/open in new tab).
        const element = event.currentTarget;
        element.setAttribute("href", href);
        window.setTimeout(() => element.removeAttribute("href"), 0);
      }}
    />
  );
});

export const QuietLink = createLink(QuietAnchor);
