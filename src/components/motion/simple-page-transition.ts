/** Keep the current page visible until the destination can fade in. */
export const simplePageTransition = {
  pendingComponent: () => null,
  pendingMs: Infinity,
  pendingMinMs: 0,
};
