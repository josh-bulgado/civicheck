import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./button.tsx", import.meta.url), "utf8");
const variant = (name: string) =>
  source.match(new RegExp(`${name}:\\s*"([^"]*)"`))?.[1] ?? "";

// The keyboard focus indicator needs 3:1 against what the button sits on. The
// other variants take a solid --ring edge; the tinted ones used a 40% edge that
// measured about 2.2:1 in dark mode.
describe("tinted buttons show a solid focus edge", () => {
  it.each([
    ["destructive", "destructive"],
    ["success", "success"],
  ])("%s", (name, token) => {
    const classes = variant(name);
    expect(classes).toMatch(new RegExp(`focus-visible:border-${token}(?![\\w/-])`));
    expect(classes).not.toContain(`focus-visible:border-${token}/`);
  });
});
