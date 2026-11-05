import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CiviCheckIdentity } from "./civic-identity";

describe("CiviCheckIdentity", () => {
  it("keeps the standard identity as the default", () => {
    const html = renderToStaticMarkup(<CiviCheckIdentity />);

    expect(html).toContain("text-lg");
    expect(html).toContain("City Civil Registrar Office");
    expect(html).not.toContain("border-brand-gold");
  });

  it("offers a compact prominent treatment for primary brand chrome", () => {
    const html = renderToStaticMarkup(
      <CiviCheckIdentity compact prominent />,
    );

    expect(html).toContain("border-brand-gold");
    expect(html).toContain("text-[23px]");
    expect(html).not.toContain("City Civil Registrar Office");
  });
});
