import { describe, expect, it } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  type AnyRouter,
} from "@tanstack/react-router";
import { startFreshSession } from "./start-fresh-session";

// A loader-backed dashboard whose data belongs to whoever is signed in, run
// with the router in browser mode (it drops its match cache entirely when it
// believes it is on a server, and under Node it would).
function makeRouter() {
  const session = { account: "A" };

  const rootRoute = createRootRoute();
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
  });
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/dashboard",
    loader: async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      return { account: session.account };
    },
  });

  const router: AnyRouter = createRouter({
    routeTree: rootRoute.addChildren([loginRoute, dashboardRoute]),
    history: createMemoryHistory({ initialEntries: ["/dashboard"] }),
    isServer: false,
    origin: "http://localhost",
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return { router, session };
}

/** What the dashboard route holds right now: its status and whose data it has. */
function snapshot(router: AnyRouter) {
  // This router's tree is not the app's registered one, so route ids are
  // compared as plain strings.
  const match = router.state.matches.find(
    (candidate) => (candidate.routeId as string) === "/dashboard",
  );
  if (!match) return "none";
  const data = match.loaderData as { account: string } | undefined;
  return `${match.status}:${data?.account ?? "-"}`;
}

/**
 * Account A signs out and account B signs in on the same tab, then lands on the
 * dashboard. Returns every distinct state the dashboard route passed through on
 * the way, in order — the states a reader could have seen painted.
 */
async function switchAccounts(resetSession: (router: AnyRouter) => void) {
  const { router, session } = makeRouter();
  await router.load();
  expect(snapshot(router)).toBe("success:A");

  await router.navigate({ to: "/login" });
  session.account = "B";

  // The `useLogin` sequence.
  resetSession(router);
  await router.invalidate();

  const seen: string[] = [];
  const sample = () => {
    const now = snapshot(router);
    if (seen[seen.length - 1] !== now) seen.push(now);
  };
  const timer = setInterval(sample, 1);
  try {
    await router.navigate({ to: "/dashboard" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    sample();
  } finally {
    clearInterval(timer);
  }
  return seen;
}

describe("signing in as a different account in the same tab", () => {
  // Control: proves the scenario is real. `invalidate` marks the router's saved
  // copy of A's dashboard stale but keeps it, and a stale copy is painted while
  // the loader reruns. If TanStack stops doing this, `startFreshSession` is no
  // longer needed and this is the test that says so.
  it("paints the previous account's data first when only invalidating", async () => {
    const seen = await switchAccounts(() => {});

    expect(seen[0]).toBe("success:A");
    expect(seen[seen.length - 1]).toBe("success:B");
  });

  it("never paints the previous account's data after startFreshSession", async () => {
    const seen = await switchAccounts(startFreshSession);

    expect(seen).not.toContain("success:A");
    expect(seen[seen.length - 1]).toBe("success:B");
  });
});
