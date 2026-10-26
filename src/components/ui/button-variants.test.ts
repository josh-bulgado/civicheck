import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buttonVariants } from "~/components/ui/button";

const source = readFileSync(new URL("./button.tsx", import.meta.url), "utf8");

// cva does not expose its variant map, so read the keys from the source.
const variantKeys = (anchor: string, end: string) => {
  const start = source.indexOf(anchor);
  const block = source.slice(start, source.indexOf(end, start));
  return [...block.matchAll(/^ {8}"?([a-z-]+)"?:/gm)].map((m) => m[1]);
};

describe("every Button variant answers hover and shows a solid focus edge", () => {
  const keys = variantKeys("      variant: {", "      size: {");
  const classesOf = (key: string) =>
    buttonVariants({ variant: key as never, size: "default" });

  it("finds the variants", () => {
    expect(keys).toEqual(
      expect.arrayContaining(["default", "ghost", "tonal", "field", "lifted"]),
    );
  });

  it.each(keys)("%s reacts to hover", (key) => {
    expect(classesOf(key)).toMatch(/hover:/);
  });

  // The base class paints a solid --ring edge on keyboard focus (3:1 against
  // what the button sits on). A variant that dims it with an opacity fails.
  it.each(keys)("%s keeps the solid focus edge", (key) => {
    expect(classesOf(key)).not.toMatch(/focus-visible:border-ring\//);
  });
});

// Safari reads the missing hue of a grey mixed in oklch as 0 degrees, so the
// hover came out red there while Chrome showed a neutral grey.
describe("quiet fills hover without an oklch mix", () => {
  it.each(["tonal", "field", "lifted"])("%s", (key) => {
    expect(buttonVariants({ variant: key as never })).not.toContain("in_oklch");
  });
});

describe("pill shape", () => {
  it("uses a large pill as the default button", () => {
    const classes = buttonVariants();

    expect(classes).toContain("h-10");
    expect(classes).toContain("rounded-full!");
  });

  it("rounds every size, not just the default one", () => {
    for (const size of ["xs", "sm", "default", "lg", "xl", "icon-lg"] as const) {
      expect(buttonVariants({ shape: "pill", size })).toContain("rounded-full!");
    }
  });

  it("allows the compact rectangular style as an explicit exception", () => {
    const classes = buttonVariants({ shape: "default", size: "default" });

    expect(classes).toContain("h-9");
    expect(classes).not.toContain("rounded-full");
  });
});

describe("the search pill", () => {
  it("is tonal, pill, xl", () => {
    const classes = buttonVariants({ variant: "tonal", shape: "pill", size: "xl" });
    expect(classes).toContain("bg-portal-search");
    expect(classes).toContain("h-12.5");
    expect(classes).toContain("rounded-full!");
  });
});
