import { describe, expect, it } from "vitest";
import { formatDateInput, maskDateInput, parseDateInput } from "~/lib/date";

describe("editable date input", () => {
  it("formats stored date keys as MM/DD/YYYY", () => {
    expect(formatDateInput("2026-11-09")).toBe("11/09/2026");
    expect(formatDateInput("not-a-date")).toBe("");
  });

  it("adds separators while typing and limits input to eight digits", () => {
    expect(maskDateInput("11")).toBe("11");
    expect(maskDateInput("1109")).toBe("11/09");
    expect(maskDateInput("11092026")).toBe("11/09/2026");
    expect(maskDateInput("11/09/2026123")).toBe("11/09/2026");
  });

  it("parses valid dates and rejects incomplete or impossible dates", () => {
    expect(parseDateInput("11/09/2026")).toBe("2026-11-09");
    expect(parseDateInput("02/29/2028")).toBe("2028-02-29");
    expect(parseDateInput("02/29/2027")).toBeNull();
    expect(parseDateInput("11/9/2026")).toBeNull();
  });
});
