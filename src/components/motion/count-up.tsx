import * as React from "react";

interface CountUpProps extends React.ComponentProps<"span"> {
  value: number;
  /** Total run time. Kept short — a stat tile shouldn't hold the eye. */
  duration?: number;
  /** Rendered on both sides of the number, e.g. a currency mark or a "%". */
  prefix?: string;
  suffix?: string;
  /** Decimal places to hold steady while counting. */
  decimals?: number;
}

/** Decelerating curve, matching `--ease-civic` so counters agree with the CSS. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Count a number up to its value when it first appears.
 *
 * Renders the final value on the server and as the initial client state, so the
 * real figure is in the DOM from the first paint — the animation is decoration
 * over correct content, never a substitute for it. Screen readers are handed
 * the settled value directly and never hear the intermediate ticks.
 */
export function CountUp({
  value,
  duration = 900,
  prefix = "",
  suffix = "",
  decimals = 0,
  ...props
}: CountUpProps) {
  const [display, setDisplay] = React.useState(value);
  const frameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || duration <= 0 || value === 0) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    setDisplay(0);

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(value * easeOut(progress));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        // Land exactly on the target rather than on whatever the easing rounds to.
        setDisplay(value);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  const formatted = display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const settled = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span {...props}>
      {/* The ticking figure is decorative; the accessible name is the real one. */}
      <span aria-hidden="true">
        {prefix}
        {formatted}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {settled}
        {suffix}
      </span>
    </span>
  );
}
