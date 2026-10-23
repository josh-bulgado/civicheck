import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "~/lib/csv";

describe("csvCell", () => {
  it("leaves plain text alone", () => {
    expect(csvCell("Marriage License")).toBe("Marriage License");
    expect(csvCell(12.5)).toBe("12.5");
  });

  it("quotes cells that hold a comma, quote or line break", () => {
    expect(csvCell("Birth, delayed")).toBe('"Birth, delayed"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });

  it("keeps formula-looking text as text", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("@home")).toBe("'@home");
  });
});

describe("toCsv", () => {
  it("writes a BOM, the header and CRLF-separated rows", () => {
    expect(toCsv(["Service", "Requests"], [["Birth", 28], ["Death, late", 2]])).toBe(
      '﻿Service,Requests\r\nBirth,28\r\n"Death, late",2',
    );
  });

  it("writes only the header when there are no rows", () => {
    expect(toCsv(["A"], [])).toBe("﻿A");
  });
});
