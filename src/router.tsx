import { createRouter } from '@tanstack/react-router'
import { PageSkeleton } from '~/components/feedback/PageSkeleton'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    // Start loading a route's data as soon as the user shows intent (hover or
    // touch-down) rather than waiting for the click. By the time the click
    // lands the loader has usually already resolved, so the destination paints
    // immediately instead of holding on a pending state.
    //
    // Routes whose loader has a side effect opt out with `preload: false` —
    // `/logout` and `/auth/callback` both do.
    defaultPreload: 'intent',
    // Ignore the brief hover of a pointer travelling across a link.
    defaultPreloadDelay: 60,
    // Treat freshly preloaded data as good enough to serve the navigation that
    // follows, instead of refetching it the moment the click arrives.
    defaultPreloadStaleTime: 30_000,
    // What a route shows while its loader runs, unless it declares its own
    // `pendingComponent`. The router's default is to show nothing for a full
    // second, which reads as a frozen page. Appear after a short grace period so
    // a fast load never flashes, and then stay long enough to read as a single
    // deliberate state instead of a flicker.
    defaultPendingComponent: PageSkeleton,
    defaultPendingMs: 250,
    defaultPendingMinMs: 250,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
