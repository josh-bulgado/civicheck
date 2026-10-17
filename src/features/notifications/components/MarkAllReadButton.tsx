import { cn } from "~/lib/utils";

interface MarkAllReadButtonProps {
  /** The shared unread count is above zero. Drives the highlight, nothing else. */
  hasUnread: boolean;
  onClick: () => void;
  /** Size only: height, padding and type. Colours and states are fixed here. */
  className?: string;
  /** A shorter label for a phone, where the button sits beside the page title. */
  compactLabel?: string;
}

/**
 * A real button that is only highlighted while something is unread. With
 * nothing unread it stays in place but goes quiet: no shadow, no pointer, and
 * out of the tab order. It is `aria-disabled` rather than `disabled` so a
 * screen reader still finds it and hears why it does nothing.
 */
export function MarkAllReadButton({
  hasUnread,
  onClick,
  className,
  compactLabel,
}: MarkAllReadButtonProps) {
  return (
    <button
      type="button"
      aria-disabled={!hasUnread}
      tabIndex={hasUnread ? undefined : -1}
      onClick={hasUnread ? onClick : undefined}
      className={cn(
        "shrink-0 rounded-full font-semibold whitespace-nowrap transition-colors duration-150",
        hasUnread
          ? "civic-press bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(11,77,162,0.25)] hover:bg-primary-hover"
          : "pointer-events-none cursor-default bg-muted text-disabled",
        className,
      )}
    >
      {compactLabel ? (
        <>
          <span className="md:hidden">{compactLabel}</span>
          <span className="max-md:hidden">Mark all as read</span>
        </>
      ) : (
        "Mark all as read"
      )}
    </button>
  );
}
