import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "../src/components/BrandLogo";

describe("approved movement mark clipping", () => {
  it("clips each repeated and compact mark independently without replacing the approved artwork", () => {
    const html = renderToStaticMarkup(
      <>
        <BrandLogo />
        <BrandLogo />
        <BrandLogo compact />
      </>,
    );
    const ids = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(html).toContain(`clip-path="url(#${id})"`);
    expect(html.match(/href="\/brand\/pasa-2026-traced.svg"/g)).toHaveLength(3);
    expect(
      html.match(/<rect x="100" y="75" width="550" height="440"/g),
    ).toHaveLength(3);
    expect(html.match(/class="brand-wordmark"/g)).toHaveLength(2);
    expect(html.match(/viewBox="100 75 550 440"/g)).toHaveLength(3);
  });
});
