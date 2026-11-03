import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CitizenDashboardBodySkeleton } from "./CitizenDashboardSkeleton";
import { EMPTY_SHAPE, type DashboardShape } from "./dashboard-shape";

const render = (shape: DashboardShape) =>
  renderToStaticMarkup(createElement(CitizenDashboardBodySkeleton, { shape }));

const parts = (html: string) =>
  [...html.matchAll(/data-part="([^"]+)"/g)].map((match) => match[1]);

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("dashboard skeleton formations", () => {
  it("draws 'What do you need today?' and the big tiles for a new account", () => {
    expect(parts(render(EMPTY_SHAPE))).toEqual(["prompt", "tiles"]);
  });

  it("draws the request card and the slim tile row for an applicant with a request", () => {
    expect(
      parts(render({ kind: "requests", hero: { lead: true, done: 1, captioned: 1, tag: false }, attention: 0, rows: 0 })),
    ).toEqual(["hero", "start", "tile-strip"]);
  });

  it("adds the attention card and the rows only when the page has them", () => {
    expect(
      parts(
        render({ kind: "requests", hero: { lead: false, done: 2, captioned: 2, tag: false }, attention: 2, rows: 1 }),
      ),
    ).toEqual(["hero", "attention", "rows", "start", "tile-strip"]);
  });

  it("draws the quiet card when nothing is in progress", () => {
    expect(
      parts(render({ kind: "requests", hero: null, attention: 0, rows: 2 })),
    ).toEqual(["idle", "rows", "start", "tile-strip"]);
  });

  it("draws one line per attention item and one row per other request", () => {
    const html = render({
      kind: "requests",
      hero: { lead: false, done: 0, captioned: 0, tag: false },
      attention: 3,
      rows: 2,
    });
    // The attention card is the only list with an icon tile.
    expect(count(html, "size-12 rounded-2xl")).toBe(3);
    expect(count(html, "h-8 w-24 rounded-full")).toBe(2);
  });

  it("gives a submitted or processing request the line under its headline", () => {
    const hero = (lead: boolean) =>
      render({ kind: "requests", hero: { lead, done: 1, captioned: 1, tag: false }, attention: 0, rows: 0 });
    expect(hero(true).length).toBeGreaterThan(hero(false).length);
    expect(hero(true)).toContain("md:w-2/5");
    expect(hero(false)).not.toContain("md:w-2/5");
  });

  it("shades the tracker stages that are finished", () => {
    const done = (finished: number) =>
      count(
        render({
          kind: "requests",
          hero: { lead: false, done: finished, captioned: 0, tag: false },
          attention: 0,
          rows: 0,
        }),
        "bg-foreground/20",
      );
    // Each finished stage is a circle, and all but the last also a line.
    expect(done(0)).toBe(0);
    expect(done(1)).toBe(2);
    expect(done(3)).toBe(6);
    // All four once released: four circles, and the three lines between them.
    expect(done(4)).toBe(7);
  });

  it("draws a line under each captioned stage, and none on a phone", () => {
    const html = render({
      kind: "requests",
      hero: { lead: false, done: 2, captioned: 3, tag: false },
      attention: 0,
      rows: 0,
    });
    expect(count(html, "mt-0.5 md:h-[clamp(1rem,2.4vh,1.4rem)]")).toBe(3);
    expect(count(html, "hidden md:block")).toBe(3);
  });

  it("draws the pill under the stage the request is in, when there is one", () => {
    const pill = (tag: boolean) =>
      count(
        render({
          kind: "requests",
          hero: { lead: false, done: 1, captioned: 2, tag },
          attention: 0,
          rows: 0,
        }),
        "w-28 rounded-full md:mt-[clamp(0.375rem,1vh,0.625rem)]",
      );
    expect(pill(true)).toBe(1);
    expect(pill(false)).toBe(0);
  });

  it("announces itself once, however it is drawn", () => {
    for (const shape of [
      EMPTY_SHAPE,
      { kind: "requests", hero: null, attention: 0, rows: 0 } as const,
    ]) {
      expect(count(render(shape), 'role="status"')).toBe(1);
    }
  });
});
