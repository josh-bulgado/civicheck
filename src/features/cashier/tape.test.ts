import { describe, expect, it } from "vitest";

import { TAPE_ROWS, stepTapeSelection, summarizeTape, tapeRows } from "./tape";

describe("summarizeTape", () => {
  it("counts the payments and adds up what they collected", () => {
    expect(summarizeTape([{ feesDue: 1100 }, { feesDue: 120 }, { feesDue: 0 }])).toEqual({
      count: 3,
      total: 1220,
    });
    expect(summarizeTape([])).toEqual({ count: 0, total: 0 });
  });
});

describe("tapeRows", () => {
  it("lists only the newest few", () => {
    const rows = Array.from({ length: TAPE_ROWS + 5 }, (_, index) => index);
    expect(tapeRows(rows)).toEqual(rows.slice(0, TAPE_ROWS));
  });
});

describe("stepTapeSelection", () => {
  it("starts at the top going down and at the bottom going up", () => {
    expect(stepTapeSelection(-1, 1, 5)).toBe(0);
    expect(stepTapeSelection(-1, -1, 5)).toBe(4);
  });

  it("stays inside the list", () => {
    expect(stepTapeSelection(4, 1, 5)).toBe(4);
    expect(stepTapeSelection(0, -1, 5)).toBe(0);
    expect(stepTapeSelection(2, 1, 5)).toBe(3);
  });

  it("selects nothing on an empty tape", () => {
    expect(stepTapeSelection(-1, 1, 0)).toBe(-1);
  });
});
