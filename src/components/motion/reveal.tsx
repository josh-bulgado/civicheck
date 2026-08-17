import * as React from "react";
import { cn } from "~/lib/utils";

interface RevealProps extends React.ComponentProps<"div"> {
  /** Hold the entrance back this many milliseconds after it is triggered. */
  delay?: number;
  /**
   * How far into the viewport the element must come before it animates.
   * Negative values delay the trigger until it is properly on screen.
   */
  rootMargin?: string;
  /** Keep animating on every entry rather than only the first. */
  repeat?: boolean;
}

/**
 * Animate a block in as it scrolls into view.
 *
 * Only for long marketing-style pages where content arrives below the fold — a
 * section the reader has to scroll to earns the entrance. Content that is
 * already on screen at load should use the pure-CSS `.civic-enter` /
 * `.civic-stagger` classes instead, which need no JavaScript at all.
 *
 * The element renders revealed and is hidden only once this component has
 * confirmed it can observe it, so a browser without IntersectionObserver — or a
 * hydration that never arrives — leaves the content plainly visible rather than
 * stranded at `opacity: 0`.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  rootMargin = "0px 0px -12% 0px",
  repeat = false,
  style,
  ...props
}: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = React.useState(true);
  const [armed, setArmed] = React.useState(false);

  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") return;

    // Anything already on screen when we mount has nothing to scroll into, so
    // leave it alone instead of hiding it just to fade it straight back in.
    const rect = element.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
    if (alreadyVisible && !repeat) return;

    setRevealed(false);
    setArmed(true);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            if (!repeat) observer.disconnect();
          } else if (repeat) {
            setRevealed(false);
          }
        }
      },
      { rootMargin, threshold: 0.05 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, repeat]);

  return (
    <div
      ref={ref}
      // The transition classes only go on once we know we are driving them, so
      // an un-armed element carries no motion styling whatsoever.
      className={cn(armed && "civic-reveal", className)}
      data-revealed={revealed}
      style={
        delay ? ({ "--enter-delay": `${delay}ms`, ...style } as React.CSSProperties) : style
      }
      {...props}
    >
      {children}
    </div>
  );
}
