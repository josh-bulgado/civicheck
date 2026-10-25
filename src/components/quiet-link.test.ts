import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { QuietAnchor } from "./quiet-link";

describe("quiet navigation", () => {
  it("keeps link focus, labels and destination options without a hover URL", () => {
    const html = renderToStaticMarkup(
      createElement(
        QuietAnchor,
        {
          href: "/system-admin/audit",
          target: "_blank",
          download: "audit.csv",
          "aria-label": "Download audit",
        },
        "Download",
      ),
    );
    expect(html).not.toMatch(/\shref=/);
    expect(html).toContain('role="link"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('download="audit.csv"');
    expect(html).toContain('aria-label="Download audit"');
  });

  it("preserves focus and role supplied by menu primitives", () => {
    const html = renderToStaticMarkup(
      createElement(QuietAnchor, {
        href: "/",
        role: "menuitem",
        tabIndex: -1,
        "aria-disabled": true,
      }),
    );
    expect(html).toContain('role="menuitem"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('aria-disabled="true"');
  });

  it("uses quiet links throughout the UI so hover URLs cannot return on another page", () => {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const violations: string[] = [];
    function walk(directory: string) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          walk(path);
          continue;
        }
        if (!path.endsWith(".tsx") || entry.name === "quiet-link.tsx") continue;
        const source = ts.createSourceFile(
          path,
          readFileSync(path, "utf8"),
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        );
        function visit(node: ts.Node) {
          if (
            ts.isImportDeclaration(node) &&
            ts.isStringLiteral(node.moduleSpecifier) &&
            node.moduleSpecifier.text === "@tanstack/react-router"
          ) {
            const bindings = node.importClause?.namedBindings;
            if (
              bindings &&
              ts.isNamedImports(bindings) &&
              bindings.elements.some(
                (item) => (item.propertyName ?? item.name).text === "Link",
              )
            ) {
              violations.push(`${relative(root, path)}: native router Link`);
            }
          }
          if (
            (ts.isJsxOpeningElement(node) ||
              ts.isJsxSelfClosingElement(node)) &&
            node.tagName.getText(source) === "a"
          ) {
            violations.push(`${relative(root, path)}: native anchor`);
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
    walk(root);
    expect(violations).toEqual([]);
  });
});
