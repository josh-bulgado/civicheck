import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock("~/features/auth/auth.queries", () => ({ getUserFn: state.getUser }));
vi.mock("~/features/auth/components/LoginForm", () => ({ LoginForm: () => null }));
vi.mock("~/components/motion/simple-page-transition", () => ({ simplePageTransition: {} }));

import { Route } from "~/routes/login";

describe("returning to the login page", () => {
  beforeEach(() => state.getUser.mockReset());

  it("opens the dashboard when the server verifies an existing session", async () => {
    state.getUser.mockResolvedValue({ id: "returning-applicant" });
    await expect(Route.options.beforeLoad!({} as never)).rejects.toMatchObject({
      options: { to: "/dashboard" },
    });
  });

  it("keeps the login form available without an active session", async () => {
    state.getUser.mockResolvedValue(null);
    await expect(Route.options.beforeLoad!({} as never)).resolves.toBeUndefined();
  });
});
