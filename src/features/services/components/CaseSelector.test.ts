import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CaseSelector } from "./CaseSelector";

it("shows the parents' marriage question for BRAP in the legacy selector", () => {
  const markup = renderToStaticMarkup(createElement(CaseSelector, {
    services: [
      { service_code: "DCOLB-0079-BRAP", name: "Delayed birth (0-79, BRAP)", fee: 0 },
      { service_code: "DCOLB-0079-NORMAL-MARITAL", name: "Delayed birth (0-79, Normal, Marital)", fee: 500 },
      { service_code: "DCOLB-0079-NORMAL-NONMARITAL", name: "Delayed birth (0-79, Normal, Non-marital)", fee: 800 },
    ],
    selectedCode: null,
    answers: { age: "0-79", program: "brap" },
    onSelect: () => {},
  }));
  expect(markup).toContain("parents legally married?");
  expect(markup).toContain("marital-marital");
  expect(markup).toContain("marital-non-marital");
});
