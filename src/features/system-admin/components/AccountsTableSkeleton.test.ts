import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountsTableSkeleton } from "./AccountsTableSkeleton";
import { accountCategories } from "../system-admin.constants";

describe("account data skeletons", () => {
  it.each(accountCategories)(
    "matches the %s table while hiding decorative rows from assistive technology",
    (category) => {
      const html = renderToStaticMarkup(
        createElement(
          "table",
          null,
          createElement(
            "tbody",
            null,
            createElement(AccountsTableSkeleton, { category }),
          ),
        ),
      );
      const columns = category === "personnel" ? 6 : 4;
      expect([...html.matchAll(/data-slot="table-row"/g)]).toHaveLength(6);
      expect([...html.matchAll(/data-slot="table-cell"/g)]).toHaveLength(
        6 * columns,
      );
      expect([...html.matchAll(/aria-hidden="true"/g)]).toHaveLength(6);
      expect(html).toContain('data-slot="skeleton"');
      expect(html).not.toContain('data-slot="spinner"');
      expect(html).not.toContain("No accounts");
    },
  );
});
