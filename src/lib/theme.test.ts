import { afterEach, describe, expect, it, vi } from "vitest";
import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  parseTheme,
  readStoredTheme,
  writeStoredTheme,
} from "~/lib/theme";

function runInitScript(storage: { getItem: (key: string) => string | null }) {
  const add = vi.fn();
  const doc = { documentElement: { classList: { add } } };
  new Function("document", "localStorage", THEME_INIT_SCRIPT)(doc, storage);
  return add;
}

describe("parseTheme", () => {
  it("accepts exactly 'dark'", () => {
    expect(parseTheme("dark")).toBe("dark");
  });

  it.each(["light", "DARK", "system", null, undefined, 42])(
    "falls back to light for %s",
    (raw) => {
      expect(parseTheme(raw)).toBe("light");
    },
  );
});

describe("THEME_INIT_SCRIPT", () => {
  it("adds the dark class when the stored theme is dark", () => {
    const add = runInitScript({ getItem: () => "dark" });
    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith("dark");
  });

  it("reads the documented storage key", () => {
    const getItem = vi.fn(() => null);
    runInitScript({ getItem });
    expect(getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
  });

  it("does nothing when nothing is stored", () => {
    expect(runInitScript({ getItem: () => null })).not.toHaveBeenCalled();
  });

  it("does not throw or add the class when storage throws", () => {
    const add = runInitScript({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(add).not.toHaveBeenCalled();
  });
});

describe("stored theme with blocked storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const blocked = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };

  it("reads as light", () => {
    vi.stubGlobal("localStorage", blocked);
    expect(readStoredTheme()).toBe("light");
  });

  it("ignores write failures", () => {
    vi.stubGlobal("localStorage", blocked);
    expect(() => writeStoredTheme("dark")).not.toThrow();
  });

  it("round-trips through working storage", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    });
    writeStoredTheme("dark");
    expect(data.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(readStoredTheme()).toBe("dark");
  });
});
