import { useEffect, useState } from "react";

/**
 * False on the first paint, true one frame later. Bars render at zero width
 * and grow to their real width once this flips, so a chart reads as filling in
 * rather than appearing pre-drawn.
 */
export function useGrown(): boolean {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return grown;
}
