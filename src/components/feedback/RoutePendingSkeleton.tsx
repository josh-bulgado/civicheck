import { PageSkeleton } from "./PageSkeleton";

/**
 * Neutral fallback for parent loaders such as session restoration. Individual
 * routes own their richer skeletons, keeping unrelated page code out of every
 * route's initial preload graph.
 */
export function RoutePendingSkeleton() {
  return <PageSkeleton />;
}
