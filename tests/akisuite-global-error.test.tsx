import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import GlobalError from "../src/app/global-error";

describe("standalone root-layout failure", () => {
  it("renders bilingual recovery without leaking error details or running reset", () => {
    const reset = vi.fn();
    const error = Object.assign(new Error("private-customer-stack"), {
      digest: "secret-incident-id",
    });
    const html = renderToStaticMarkup(
      <GlobalError error={error} reset={reset} />,
    );
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('content="noindex, nofollow"');
    expect(html).toContain('lang="es"');
    expect(html).toContain("AkiSuite");
    expect(html).toContain("Reintentar");
    expect(html).toContain('href=""');
    expect(html).not.toContain("private-customer-stack");
    expect(html).not.toContain("secret-incident-id");
    expect(html).not.toMatch(/<form|<script|<img|<nav/);
    expect(reset).not.toHaveBeenCalled();
  });
});
