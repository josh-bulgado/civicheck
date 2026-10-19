import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./app.css", import.meta.url), "utf8");

/** Flat `--name: value;` declarations of the first block opened by exactly `selector`. */
function parseBlock(source: string, selector: string): Record<string, string> {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const open = new RegExp(`(^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`);
  const match = open.exec(stripped);
  if (!match) throw new Error(`No ${selector} block in app.css`);
  const start = match.index + match[0].length;
  let depth = 1;
  let end = start;
  while (depth > 0 && end < stripped.length) {
    const ch = stripped[end++];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
  }
  const props: Record<string, string> = {};
  for (const decl of stripped.slice(start, end - 1).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    props[decl[1]] = decl[2].replace(/\s+/g, " ").trim();
  }
  return props;
}

const root = parseBlock(css, ":root");
const dark = parseBlock(css, ".dark");

/** Resolve a token in the dark theme, falling back to :root and following var(). */
function dk(name: string): string {
  const raw = dark[name] ?? root[name];
  if (raw === undefined) throw new Error(`${name} is not defined`);
  const ref = /^var\((--[\w-]+)\)$/.exec(raw);
  return ref ? dk(ref[1]) : raw;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** `fg` at `alpha` laid over `bg`, as a 6-digit hex. */
function blend(fg: string, alpha: number, bg: string): string {
  const mix = (shift: number) => {
    const a = (parseInt(fg.slice(1), 16) >> shift) & 255;
    const b = (parseInt(bg.slice(1), 16) >> shift) & 255;
    return Math.round(a * alpha + b * (1 - alpha));
  };
  return `#${[16, 8, 0].map((sh) => mix(sh).toString(16).padStart(2, "0")).join("")}`;
}

function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

// Colours that are the same in both themes on purpose: brand marks, the
// always-dark panel tokens, and white labels that sit on a fill.
const SAME_IN_BOTH = new Set([
  "--brand-red",
  "--brand-gold",
  "--primary-foreground",
  "--sidebar-primary-foreground",
  "--panel-dark",
  "--panel-dark-row",
  "--panel-dark-divider",
  "--panel-dark-highlight",
  "--panel-dark-highlight-border",
  "--panel-dark-text",
  "--panel-dark-muted",
]);

const COLOUR_VALUE =
  /^(#|color-mix\(|linear-gradient\(|radial-gradient\(|rgba?\(|oklch\(|hsla?\(|var\()/;

function coveredInDark(name: string): boolean {
  if (name in dark || SAME_IN_BOTH.has(name)) return true;
  const ref = /^var\((--[\w-]+)\)$/.exec(root[name] ?? "");
  return ref ? coveredInDark(ref[1]) : false;
}

describe("dark tokens: completeness", () => {
  it("gives every colour token in :root a dark value (or an explained exemption)", () => {
    const missing = Object.entries(root)
      .filter(([, value]) => COLOUR_VALUE.test(value))
      .map(([name]) => name)
      .filter((name) => !coveredInDark(name));
    expect(missing).toEqual([]);
  });

  it("gives every portal shadow a dark value", () => {
    const shadows = Object.keys(root).filter((n) => n.startsWith("--portal-shadow-"));
    expect(shadows.length).toBeGreaterThan(0);
    expect(shadows.filter((n) => !(n in dark))).toEqual([]);
  });

  it("covers the workspace surface shadows, and none is `none`", () => {
    const shadows = Object.keys(root).filter((n) => n.startsWith("--surface-shadow"));
    expect(shadows.length).toBeGreaterThan(0);
    for (const name of shadows) {
      expect(dark[name], name).toBeDefined();
      // `none` would invalidate the whole box-shadow list it is dropped into.
      expect(dark[name], name).not.toBe("none");
    }
  });

  it("keeps light unchanged for the accent split", () => {
    expect(root["--primary-fill"]).toBe("var(--primary)");
    expect(root["--primary-fill-hover"]).toBe("var(--primary-hover)");
  });
});

describe("dark tokens: Graphite values from the spec", () => {
  it.each([
    ["--background", "#101216"],
    ["--workspace", "#121419"],
    ["--card", "#181b21"],
    ["--sidebar", "#14171c"],
    ["--foreground", "#e8eaee"],
    ["--muted-foreground", "#9aa1ad"],
    ["--border", "#2a2f38"],
    ["--primary", "#7aa8ea"],
    ["--primary-soft", "#1a2740"],
    ["--primary-fill", "#3069c0"],
    ["--tone-review", "#93b9f0"],
    ["--tone-review-soft", "#1a2740"],
    ["--tone-progress", "#bdb0ee"],
    ["--tone-progress-soft", "#27213f"],
    ["--tone-warning", "#eac26e"],
    ["--tone-warning-soft", "#33290f"],
    ["--tone-success", "#85d3a6"],
    ["--tone-success-soft", "#12291d"],
    ["--tone-danger", "#f0a3a3"],
    ["--tone-danger-soft", "#361b1b"],
    ["--tone-neutral", "#b1b7c2"],
    ["--tone-neutral-soft", "#22262d"],
  ])("%s is %s", (name, value) => {
    expect(dk(name).toLowerCase()).toBe(value);
  });
});

describe("dark tokens: contrast", () => {
  const AA = 4.5;

  it.each([
    ["--foreground", "--background"],
    ["--foreground", "--workspace"],
    ["--foreground", "--card"],
    ["--card-foreground", "--card"],
    ["--popover-foreground", "--popover"],
    ["--sidebar-foreground", "--sidebar"],
    ["--sidebar-muted", "--sidebar"],
    ["--muted-foreground", "--background"],
    ["--muted-foreground", "--workspace"],
    ["--muted-foreground", "--card"],
    ["--muted-foreground", "--muted"],
    ["--muted-foreground", "--portal-panel"],
    ["--muted-2", "--card"],
    ["--body", "--card"],
    ["--body-2", "--card"],
    ["--portal-ink-2", "--portal-panel"],
    ["--primary", "--card"],
    ["--primary", "--background"],
    ["--primary", "--primary-soft"],
    ["--accent-foreground", "--accent"],
    ["--sidebar-accent-foreground", "--sidebar-accent"],
    ["--primary-foreground", "--primary-fill"],
    ["--primary-foreground", "--primary-fill-hover"],
    ["--sidebar-primary-foreground", "--sidebar-primary"],
    ["--destructive", "--card"],
    ["--destructive", "--portal-danger-soft"],
    ["--success", "--card"],
    ["--warning", "--card"],
    ["--warning-strong", "--warning-soft"],
  ])("%s on %s is at least AA", (fg, bg) => {
    expect(contrast(dk(fg), dk(bg))).toBeGreaterThanOrEqual(AA);
  });

  it.each(["review", "progress", "warning", "success", "danger", "neutral"])(
    "status tone %s clears 7:1 on its tint",
    (tone) => {
      expect(
        contrast(dk(`--tone-${tone}`), dk(`--tone-${tone}-soft`)),
      ).toBeGreaterThanOrEqual(7);
    },
  );

  it.each(["success", "info", "warning", "error", "neutral"])(
    "health %s text is AA on its background",
    (kind) => {
      expect(
        contrast(dk(`--health-${kind}-fg`), dk(`--health-${kind}-bg`)),
      ).toBeGreaterThanOrEqual(AA);
    },
  );

  // The page-header band: white text at partial opacity, the gold eyebrow, and
  // the 10%-white stat tiles on it. Light is unchanged (the band is --primary).
  describe("page-header band", () => {
    it("is the plain brand fill in light", () => {
      expect(root["--hero-fill"]).toBe("var(--primary-fill)");
    });

    const hero = () => dk("--hero-fill");
    const tile = () => blend("#ffffff", 0.1, hero());

    it.each([0.65, 0.75, 0.8, 0.9])("white at %s opacity is AA on the band", (alpha) => {
      expect(contrast(blend("#ffffff", alpha, hero()), hero())).toBeGreaterThanOrEqual(AA);
    });

    it.each([0.65, 0.8])("white at %s opacity is AA on a stat tile", (alpha) => {
      expect(contrast(blend("#ffffff", alpha, tile()), tile())).toBeGreaterThanOrEqual(AA);
    });

    it("gold eyebrow is AA on the band", () => {
      expect(contrast(dk("--brand-gold"), hero())).toBeGreaterThanOrEqual(AA);
    });
  });

  it("keeps skeletons visible on cards and the workspace", () => {
    expect(contrast(dk("--skeleton"), dk("--card"))).toBeGreaterThanOrEqual(1.2);
    expect(contrast(dk("--skeleton"), dk("--workspace"))).toBeGreaterThanOrEqual(1.2);
  });
});

// The sign-in and sign-up pages sit on a near-black blue page with fields drawn
// as a quiet outline on the same colour (the GitHub dark look). The edge is
// deliberately soft, so only a visibility floor is asserted for it, not 3:1.
describe("auth page surface (dark)", () => {
  it.each([
    "--foreground",
    "--muted-foreground",
    "--primary",
    "--destructive",
    "--body-2",
  ])("%s is AA on the auth page", (token) => {
    expect(contrast(dk(token), dk("--auth-bg"))).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the quiet field edge visible (at least 1.8:1)", () => {
    expect(contrast(dk("--auth-edge"), dk("--auth-bg"))).toBeGreaterThanOrEqual(1.8);
  });

  it("is the same page colour as the card in light", () => {
    expect(root["--auth-bg"]).toBe("var(--card)");
  });
});
