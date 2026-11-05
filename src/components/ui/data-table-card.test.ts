import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTableLoadingRows } from "./data-table-card";

describe("DataTableLoadingRows", () => {
  it("renders a skeleton for every loading cell", () => {
    const html = renderToStaticMarkup(
      createElement(
        "table",
        null,
        createElement(
          "tbody",
          null,
          createElement(DataTableLoadingRows, { columns: 3, rows: 2 }),
        ),
      ),
    );

    expect(html.match(/<tr/g)).toHaveLength(2);
    expect(html.match(/data-slot="skeleton"/g)).toHaveLength(6);
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
  });
});
