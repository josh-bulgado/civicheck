/**
 * Class sets that give shadcn's `Table` the citizen portal's ruled look:
 * hairlines instead of a tinted header, cells flush with the card's padding.
 */
export const portalTable = {
  headRow: "border-y border-border-light hover:bg-transparent",
  head: "h-auto px-3 py-3 text-[13px] font-medium text-muted-foreground first:pl-0 last:pr-0",
  body: "[&_tr:last-child]:border-b",
  row: "border-border-lighter hover:bg-surface-subtle",
  cell: "px-3 py-3.5 first:pl-0 last:pr-0",
  /** The quiet pill that opens a row's detail page. */
  action:
    "inline-flex h-8 items-center rounded-full bg-muted px-3.5 text-[13px] font-semibold whitespace-nowrap text-foreground hover:bg-primary-soft hover:text-primary-hover",
} as const;

/**
 * The portal's fully rounded buttons. Layer one over `Button` or
 * `buttonVariants`, with `variant="outline"` for the outline pill.
 */
export const pillButton = {
  primary:
    "civic-press h-12 rounded-full px-5.5 text-[15px] font-semibold hover:bg-primary-hover",
  outline:
    "civic-press h-11 rounded-full border-border bg-white px-5 text-sm font-semibold shadow-none hover:bg-primary-tint hover:text-primary-hover",
  /**
   * White pill with the light lift, brand-blue text; solid blue on hover. For
   * the secondary action in a page's title row ("All requests", "See all
   * services"). Complete on its own: use it on a `Link` without `Button`.
   */
  light:
    "civic-press inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-white px-5.5 text-base font-semibold whitespace-nowrap text-primary shadow-portal-pill transition-colors duration-150 hover:bg-primary hover:text-white",
} as const;
