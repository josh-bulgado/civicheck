import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ peer: undefined as string | undefined }));
vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => new Request("https://app.test", { headers: { "x-real-ip": "2001:db8:abcd:12::99", "x-forwarded-for": "192.0.2.9" } }),
  getRequestIP: (options: { xForwardedFor: boolean }) => {
    expect(options.xForwardedFor).toBe(false);
    return state.peer;
  },
}));
import { getClientIp, normalizeClientIp } from "./client-ip";
afterEach(() => { vi.unstubAllEnvs(); state.peer = undefined; });
describe("trusted client IP", () => {
  it.each([
    ["2001:0db8:abcd:0012:ab00:0:0:1", "2001:db8:abcd:12::"],
    ["2001:db8:abcd:12::ffff", "2001:db8:abcd:12::"],
    ["::ffff:192.0.2.10", "192.0.2.10"],
    ["192.0.2.10", "192.0.2.10"],
    ["bad", null], ["192.0.2.1, 192.0.2.2", null], ["fe80::1%eth0", null],
  ])("normalizes %s", (raw, expected) => expect(normalizeClientIp(raw)).toBe(expected));
  it("uses Vercel's overwritten IP header", () => {
    vi.stubEnv("VERCEL", "1");
    expect(getClientIp()).toBe("2001:db8:abcd:12::");
  });
  it("ignores spoofed forwarded headers outside Vercel", () => {
    vi.stubEnv("VERCEL", "");
    expect(getClientIp()).toBeNull();
    state.peer = "127.0.0.1";
    expect(getClientIp()).toBe("127.0.0.1");
  });
});
