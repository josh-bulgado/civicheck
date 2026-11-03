import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LeadTracker } from "./LeadTracker";

const render = (status: string) =>
  renderToStaticMarkup(createElement(LeadTracker, { status }));

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("LeadTracker", () => {
  it("draws all four stages finished, and none under way, once a request is released", () => {
    const html = render("released");

    expect(count(html, "(done)")).toBe(4);
    expect(count(html, "(current)")).toBe(0);
    expect(count(html, "(pending)")).toBe(0);
    expect(count(html, "aria-current")).toBe(0);
  });

  it("draws the stage a request is in, with the ones before it done and the ones after pending", () => {
    const html = render("processing");

    expect(count(html, "(done)")).toBe(2);
    expect(count(html, "(current)")).toBe(1);
    expect(count(html, "(pending)")).toBe(1);
  });

  it("draws a submitted request with Submission done and nothing under way", () => {
    const html = render("submitted");

    expect(count(html, "(done)")).toBe(1);
    expect(count(html, "(current)")).toBe(0);
    expect(count(html, "(pending)")).toBe(3);
  });
});
