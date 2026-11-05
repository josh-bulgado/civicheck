import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";

function renderGroup(
  groupProps: React.ComponentProps<typeof ButtonGroup> = {},
  buttonProps: React.ComponentProps<typeof Button> = {},
) {
  return renderToStaticMarkup(
    createElement(
      ButtonGroup,
      groupProps,
      createElement(Button, buttonProps, "Action"),
    ),
  );
}

describe("ButtonGroup variants", () => {
  it("inherits Button defaults", () => {
    const html = renderGroup();

    expect(html).toContain('data-variant="default"');
    expect(html).toContain('data-size="lg"');
    expect(html).toContain('data-shape="pill"');
    expect(html).toContain("h-10");
    expect(html).toContain("rounded-full!");
    expect(html).toContain("bg-primary-fill");
  });

  it("passes variant, size, and shape to child buttons", () => {
    const html = renderGroup({
      variant: "outline",
      size: "sm",
      shape: "split",
    });

    expect(html).toContain('data-variant="outline"');
    expect(html).toContain('data-size="sm"');
    expect(html).toContain('data-shape="split"');
    expect(html).toContain("h-8");
    expect(html).toContain("rounded-xl!");
    expect(html).toContain("border-border");
  });

  it("allows a child button to override group styles", () => {
    const html = renderGroup(
      { variant: "outline", size: "sm", shape: "split" },
      { variant: "destructive", size: "xs", shape: "pill" },
    );

    expect(html).toContain("h-6");
    expect(html).toContain("rounded-full!");
    expect(html).toContain("text-destructive");
  });
});
