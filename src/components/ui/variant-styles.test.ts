import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { kbdVariants } from "~/components/ui/kbd";
import { tabsListVariants } from "~/components/ui/tabs";

const read = (name: string) =>
  readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

const variantKeys = (source: string, anchor: string) => {
  // cva does not expose its variant map, so read the keys from the source.
  const start = source.indexOf(anchor);
  const block = source.slice(start, source.indexOf("defaultVariants", start));
  return [...block.matchAll(/^\s{8}(?:"([a-z-]+)"|([a-z]+)):/gm)].map(
    (match) => match[1] ?? match[2],
  );
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
      expect.arrayContaining([
        "default",
        "outline",
        "segmented",
        "brand-pill",
        "sliding",
      ]),
    );
  });

  it.each(keys.filter((key) => !legacy.includes(key)))("%s", (key) => {
    const items = source.slice(source.indexOf("const toggleGroupItemVariants"));
    expect(items).toMatch(new RegExp(`^\\s{8}(?:"${key}"|${key}):`, "m"));
  });
});

describe("pill-shaped controls expose an explicit API", () => {
  const controls = [
    ["button.tsx", ['pill: "rounded-full!']],
    ["input.tsx", ["shape?:", "data-[shape=pill]:rounded-full"]],
    ["input-group.tsx", ["shape?:", "data-[shape=pill]:rounded-full"]],
    ["toggle.tsx", ["shape: {", 'pill: "rounded-full"']],
    ["select.tsx", ["shape?:", "data-[shape=pill]:rounded-full"]],
    ["date-picker.tsx", ["shape?:", "shape={shape}"]],
    ["command.tsx", ["shape?:", "shape={shape}"]],
    ["sidebar.tsx", ["shape: {", 'pill: "rounded-full"']],
    ["kbd.tsx", ["shape: {", 'pill: "rounded-full px-2"']],
    ["skeleton.tsx", ["shape?:", "data-[shape=pill]:rounded-full"]],
    ["item.tsx", ["shape: {", 'pill: "rounded-full"']],
    ["tabs.tsx", ['pill: "gap-1 rounded-full']],
    ["toggle-group.tsx", ['pill: "gap-0.5 rounded-full']],
  ] as const;

  it.each(controls)("%s", (file, markers) => {
    const source = read(file);
    for (const marker of markers) expect(source).toContain(marker);
  });
});

describe("soft and split shapes step the radius with the height", () => {
  const controls = [
    ["button.tsx", ['soft: ""', 'split: ""', "rounded-2xl!"]],
    ["input.tsx", ["data-[shape=soft]:rounded-xl!", "data-[shape=split]:rounded-xl!"]],
    ["input-group.tsx", ["data-[shape=soft]:rounded-xl!", "data-[shape=split]:rounded-xl!"]],
    ["select.tsx", ["data-[shape=soft]:rounded-xl!", "data-[shape=split]:rounded-xl!"]],
    ["toggle.tsx", ['soft: ""', 'split: ""', "rounded-2xl"]],
    ["kbd.tsx", ['soft: "rounded-md px-1.5"', 'split: "rounded-md px-1.5"']],
    ["item.tsx", ['soft: "rounded-xl"', 'split: "rounded-xl"']],
    ["input-otp.tsx", ['soft: "rounded-xl"', 'split: "rounded-xl"']],
    ["sidebar.tsx", ['soft: "rounded-xl"', 'split: "rounded-xl"']],
    ["tabs.tsx", ['rounded: "gap-1 rounded-2xl']],
    ["toggle-group.tsx", ['rounded: "gap-0.5 rounded-2xl']],
  ] as const;

  it.each(controls)("%s", (file, markers) => {
    const source = read(file);
    for (const marker of markers) expect(source).toContain(marker);
  });
});

describe("form and action controls default to large pills", () => {
  const defaults = [
    ["button.tsx", ['size = "lg"', 'shape = "pill"']],
    ["input.tsx", ['fieldSize = "lg"', 'shape = "pill"']],
    ["input-group.tsx", ['fieldSize = "lg"', 'shape = "pill"']],
    ["select.tsx", ['size = "lg"', 'shape = "pill"']],
    ["date-picker.tsx", ['size = "lg"', 'shape = "pill"']],
    ["toggle.tsx", ['size = "lg"', 'shape = "pill"']],
    ["toggle-group.tsx", ['size = "lg"', 'shape = "pill"']],
    ["input-otp.tsx", ['size = "lg"', 'shape = "pill"']],
  ] as const;

  it.each(defaults)("%s", (file, markers) => {
    const source = read(file);
    for (const marker of markers) expect(source).toContain(marker);
  });
});

describe("Kbd variants", () => {
  it("keeps the default key surface", () => {
    expect(kbdVariants()).toContain("bg-muted");
    expect(kbdVariants()).toContain("text-muted-foreground");
  });

  it("supports a transparent ghost surface", () => {
    const classes = kbdVariants({ variant: "ghost" });
    expect(classes).toContain("bg-transparent");
    expect(classes).toContain("text-current");
  });
});

// Card surfaces. Each variant is a name in the prop type, a block of
// `data-[variant=...]` classes, and (for the portal ones) a shadow token that
// has to exist in both themes or the card has no edge in one of them.
describe("every Card variant styles itself", () => {
  const source = read("card.tsx");
  const css = readFileSync(
    new URL("../../styles/app.css", import.meta.url),
    "utf8",
  );
  const surfaces = ["embedded", "soft", "quiet", "lifted", "tonal", "reveal"];

  it.each(surfaces)("%s", (key) => {
    expect(source).toContain(`"${key}"`);
    expect(source).toContain(`data-[variant=${key}]:`);
  });

  it("row orientation has its styles", () => {
    expect(source).toContain('orientation?: "column" | "row"');
    expect(source).toContain("data-[orientation=row]:grid");
  });

  it.each(["hairline", "hairline-hover", "lifted"])(
    "shadow token %s is mapped and set in light and dark",
    (name) => {
      expect(css).toContain(`--shadow-portal-${name}: var(--portal-shadow-${name})`);
      const declared = css.match(new RegExp(`^\\s*--portal-shadow-${name}:`, "gm"));
      expect(declared?.length).toBeGreaterThanOrEqual(2);
    },
  );
});
