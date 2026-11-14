import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  router: { preloadRoute: vi.fn(), navigate: vi.fn(), invalidate: vi.fn() },
  freshSession: vi.fn(),
  hint: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({ useRouter: () => state.router }));
vi.mock("~/hooks/useMutation", () => ({ useMutation: (options: unknown) => options }));
vi.mock("../auth.mutations", () => ({ loginWithEmailFn: vi.fn() }));
vi.mock("../current-user", () => ({ hintCurrentUser: state.hint }));
vi.mock("../start-fresh-session", () => ({ startFreshSession: state.freshSession }));

import { useLogin } from "./useLogin";

// The mocked mutation exposes its success handler without mounting a form.
function useLoginOptions(redirect?: string) {
  return useLogin(redirect) as unknown as {
    onSuccess: (ctx: { data: { error: boolean; userId?: string; role?: string } }) => Promise<void>;
  };
}

beforeEach(() => vi.resetAllMocks());

describe("staff sign-in navigation", () => {
  it.each(["staff", "supervisor"])("waits for the %s dashboard before leaving sign-in", async (role) => {
    let finishLoading!: () => void;
    state.router.preloadRoute.mockReturnValue(new Promise<void>((resolve) => { finishLoading = resolve; }));
    const signingIn = useLoginOptions().onSuccess({ data: { error: false, userId: "new-account", role } });
    expect(state.freshSession).toHaveBeenCalledWith(state.router);
    expect(state.hint).toHaveBeenCalledWith({ id: "new-account", role });
    expect(state.router.preloadRoute).toHaveBeenCalledWith({ to: "/staff-dashboard" });
    expect(state.router.navigate).not.toHaveBeenCalled();
    expect(state.router.invalidate).not.toHaveBeenCalled();
    finishLoading();
    await signingIn;
    expect(state.router.navigate).toHaveBeenCalledWith({ to: "/staff-dashboard" });
  });

  it("preserves an explicit sign-in destination", async () => {
    await useLoginOptions("/requests").onSuccess({ data: { error: false, userId: "staff", role: "staff" } });
    expect(state.router.preloadRoute).not.toHaveBeenCalled();
    expect(state.router.navigate).toHaveBeenCalledWith({ to: "/requests" });
  });

  it.each(["/dashboard", "/staff-dashboard"])("preloads the dashboard when login redirects back to %s", async (redirect) => {
    await useLoginOptions(redirect).onSuccess({ data: { error: false, userId: "staff", role: "staff" } });
    expect(state.router.preloadRoute).toHaveBeenCalledWith({ to: "/staff-dashboard" });
    expect(state.router.navigate).toHaveBeenCalledWith({ to: "/staff-dashboard" });
    expect(state.router.invalidate).not.toHaveBeenCalled();
  });

  it("keeps failed sign-ins on the form", async () => {
    await useLoginOptions().onSuccess({ data: { error: true } });
    expect(state.freshSession).not.toHaveBeenCalled();
    expect(state.router.navigate).not.toHaveBeenCalled();
  });
});
