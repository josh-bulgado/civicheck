import { createRouter } from '@tanstack/react-router'
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
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
