import type { CSSProperties } from "react";

/**
 * Position a child inside a `.civic-stagger` list so it animates in after the
 * ones above it.
 *
 * Kept as a style helper rather than a wrapper component on purpose: cascading
 * a list means tagging each item with its index, and doing that inline at the
 * `.map()` call is both cheaper and clearer than cloning children to inject a
 * prop.
 *
 * ```tsx
 * <div className="civic-stagger">
 *   {items.map((item, index) => (
 *     <Card key={item.id} style={staggerStyle(index)} />
 *   ))}
 * </div>
 * ```
 */
export function staggerStyle(index: number, baseDelayMs = 0): CSSProperties {
  return {
    "--civic-index": index,
    ...(baseDelayMs ? { "--stagger-base": `${baseDelayMs}ms` } : null),
  } as CSSProperties;
}

/**
 * Delay a single element's entrance, for one-off elements outside a list.
 */
export function enterDelay(delayMs: number): CSSProperties {
  return { "--enter-delay": `${delayMs}ms` } as CSSProperties;
}
