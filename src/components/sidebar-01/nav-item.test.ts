import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./nav-item.tsx", import.meta.url), "utf8");

describe("notification badge contrast", () => {
  it("keeps dark ink on the gold fill in both themes", () => {
    const badgeClasses = source.match(/className="([^"]*bg-brand-gold[^"]*)"/)?.[1] ?? "";

    expect(badgeClasses).toContain("text-panel-dark");
    expect(badgeClasses).not.toContain("text-foreground");
  });
});
