import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pillButton } from "~/components/portal/styles";

const read = (name: string) =>
  readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

// The default Button and link Badge lightened on hover before the accent was
// split (80% of the brand blue). Landing and sign-in share them and stay light,
// so that behaviour must not change.
describe("default primary hover keeps its light behaviour", () => {
  it("Button default lightens with an 80% fill", () => {
    const line = read("button.tsx").match(/default:\s*"([^"]*)"/)?.[1] ?? "";
    expect(line).toContain("bg-primary-fill");
    expect(line).toContain("hover:bg-primary-fill/80");
    expect(line).not.toContain("hover:bg-primary-fill-hover");
  });

  it("Badge default link lightens with an 80% fill", () => {
    const line = read("badge.tsx").match(/default:\s*"([^"]*)"/)?.[1] ?? "";
    expect(line).toContain("[a]:hover:bg-primary-fill/80");
  });
});

// Hover on a solid blue button must stay on the fill colour. The ink colours
// (--primary, --primary-hover) are light in dark mode and white text on them
// fails contrast.
describe("portal pill buttons use fill colours on hover", () => {
  it("primary hovers to the darker fill", () => {
    expect(pillButton.primary).toContain("hover:bg-primary-fill-hover");
    expect(pillButton.primary).not.toMatch(/hover:bg-primary-hover/);
  });

  it("light pill goes solid blue on the fill, with white text", () => {
    expect(pillButton.light).toContain("hover:bg-primary-fill");
    expect(pillButton.light).not.toMatch(/hover:bg-primary(?![\w-])/);
  });

  it("outline and light pills sit on the card, not white", () => {
    expect(pillButton.outline).toContain("bg-card");
    expect(pillButton.light).toContain("bg-card");
  });
});
