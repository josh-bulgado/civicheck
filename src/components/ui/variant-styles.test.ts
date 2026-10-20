import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tabsListVariants } from "~/components/ui/tabs";

const read = (name: string) =>
  readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

const variantKeys = (source: string, anchor: string) => {
  // cva does not expose its variant map, so read the keys from the source.
  const start = source.indexOf(anchor);
  const block = source.slice(start, source.indexOf("defaultVariants", start));
  return [...block.matchAll(/^\s{8}([a-z]+):/gm)].map((m) => m[1]);
};

// A variant the list or group paints but whose items never style themselves
// renders as unstyled buttons, so every variant name must show up in the item
// classes too.
describe("every TabsList variant styles its triggers", () => {
  const source = read("tabs.tsx");
  const keys = variantKeys(source, "const tabsListVariants");

  it("finds the variants", () => {
    expect(keys).toEqual(
      expect.arrayContaining(["default", "line", "glide", "stages", "rail"]),
    );
  });

  it.each(keys.filter((key) => key !== "default"))("%s", (key) => {
    expect(source).toContain(`group-data-[variant=${key}]/tabs-list:`);
  });

  it("builds a class for each variant", () => {
    for (const key of keys) {
      expect(tabsListVariants({ variant: key as never })).toBeTruthy();
    }
  });
});

describe("every ToggleGroup variant has item styles", () => {
  const source = read("toggle-group.tsx");
  const keys = variantKeys(source, "const toggleGroupVariants");
  const legacy = ["default", "outline"];

  it("finds the variants", () => {
    expect(keys).toEqual(
      expect.arrayContaining(["default", "outline", "segmented", "sliding"]),
    );
  });

  it.each(keys.filter((key) => !legacy.includes(key)))("%s", (key) => {
    const items = source.slice(source.indexOf("const toggleGroupItemVariants"));
    expect(items).toMatch(new RegExp(`^\\s{8}${key}:`, "m"));
  });
});
