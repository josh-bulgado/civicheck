import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageSkeleton } from "./PageSkeleton";
import { RoutePendingSkeleton } from "./RoutePendingSkeleton";

describe("parent route loading", () => {
  it("uses the neutral page while a parent loader finishes", () => {
    expect(renderToStaticMarkup(createElement(RoutePendingSkeleton))).toContain(
      renderToStaticMarkup(createElement(PageSkeleton)),
    );
  });
});
