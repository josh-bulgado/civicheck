import { describe, expect, it } from "vitest";
import {
  CITIZEN_INSET_CLASS,
  CITIZEN_MAIN_CLASS,
  CITIZEN_PANEL_CLASS,
} from "./workspace";

describe("citizen workspace mobile width", () => {
  it("keeps every nested flex boundary shrinkable", () => {
    for (const className of [
      CITIZEN_INSET_CLASS,
      CITIZEN_PANEL_CLASS,
      CITIZEN_MAIN_CLASS,
    ]) {
      expect(className).toContain("min-w-0");
      expect(className).toContain("max-w-full");
    }
  });

  it("contains horizontal scrolling inside dashboard scrollers", () => {
    expect(CITIZEN_INSET_CLASS).toContain("overflow-x-clip");
  });
});
