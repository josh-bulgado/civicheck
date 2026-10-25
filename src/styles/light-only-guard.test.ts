import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("..", import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

// Pages that never go dark, and documents that stay light, may use literal
// light colours freely.
const LIGHT_ONLY = [
  // The Google logo keeps its brand colours.
  "features/auth/components/GoogleIcon",
  "features/requests/pdf/",
  "components/blocks/",
  "components/pdf/",
  "utils/",
  // Not UI: an email's HTML, and canvas backgrounds used while resizing photos.
  "features/admin/staff/staff.mutations.ts",
  "lib/avatar-image.ts",
  "features/apply/upload-image.utils.ts",
  "routeTree.gen.ts",
];

// One-off signed-in lines that are light on purpose, by `file: text`.
const ALLOWED: Array<[file: string, includes: string, why: string]> = [
  [
    "features/admin/reports/components/ReportSheet.tsx",
    "bg-white",
    "The report sheet is paper: white in either theme, so it looks the way it prints.",
  ],
];

const files = walk(SRC)
  // Class strings also live in plain .ts files (shared style sets), so look there too.
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.ts$/.test(f))
  .map((f) => relative(SRC, f).replaceAll("\\", "/"))
  .filter((f) => !LIGHT_ONLY.some((prefix) => f.startsWith(prefix)));

// bg-white over 25% opacity is a surface and must be bg-card; low-alpha white is
// an overlay on a blue hero and is fine in both themes.
const OPAQUE_WHITE =
  /(?<![\w-])(?:bg|ring|border|from|to|via|fill|stroke|decoration)-white(?!\/(?:10|15|20|25)(?![\d]))(?![\w-])/;
const LITERAL_HEX_CLASS = /(?<![\w-])(?:[\w[\]=()-]+:)*(?:bg|text|border|from|to|via|fill|stroke|decoration)-\[#[0-9a-fA-F]{3,8}\]/;

describe("signed-in code has no light-only colours", () => {
  it("never uses an opaque white surface", () => {
    const offenders = files.flatMap((file) =>
      readFileSync(join(SRC, file), "utf8")
        .split("\n")
        .flatMap((line, i) =>
          OPAQUE_WHITE.test(line) && !ALLOWED.some(([f, t]) => f === file && line.includes(t))
            ? [`${file}:${i + 1}`]
            : [],
        ),
    );
    expect(offenders).toEqual([]);
  });

  it("gives every literal hex colour class a dark: counterpart on the same line", () => {
    const offenders = files.flatMap((file) =>
      readFileSync(join(SRC, file), "utf8")
        .split("\n")
        .flatMap((line, i) =>
          LITERAL_HEX_CLASS.test(line) &&
          !/\bdark:/.test(line) &&
          !ALLOWED.some(([f, t]) => f === file && line.includes(t))
            ? [`${file}:${i + 1}: ${line.trim().slice(0, 100)}`]
            : [],
        ),
    );
    expect(offenders).toEqual([]);
  });
});
