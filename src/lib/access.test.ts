import { afterEach, describe, expect, it, vi } from "vitest";
import { isModuleLoadError, isNetworkError } from "./access";

afterEach(() => vi.unstubAllGlobals());

describe("route loading errors", () => {
  it.each([
    "Failed to fetch dynamically imported module: http://localhost:3000/src/routes/requests.tsx",
    "error loading dynamically imported module",
    "Importing a module script failed.",
    "Loading chunk 4 failed.",
    "Outdated Optimize Dep",
  ])("does not report an online module-loading failure as offline: %s", (message) => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(isModuleLoadError(new Error(message))).toBe(true);
    expect(isNetworkError(new Error(message))).toBe(false);
  });
  it("still shows offline when the browser confirms a lost connection", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(isNetworkError(new Error("Failed to fetch dynamically imported module"))).toBe(true);
  });
  it("preserves ordinary network-failure handling", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isModuleLoadError(new TypeError("Failed to fetch"))).toBe(false);
    expect(isNetworkError(new Error("Invalid input"))).toBe(false);
  });
});
