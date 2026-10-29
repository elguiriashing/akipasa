import React from "react";

/** Founder-approved 2026 movement mark. Keep original wordmark as semantic text. */
export function BrandMark() {
  return (
    <svg
      className="brand-pin"
      viewBox="100 75 550 440"
      aria-hidden="true"
      focusable="false"
    >
      <image href="/brand/pasa-2026-traced.svg" width="768" height="768" />
    </svg>
  );
}

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-logo" aria-hidden="true">
      <BrandMark />
      {!compact && (
        <span className="brand-wordmark">
          <span>Aki</span>
          <span className="brand-pasa">Pasa</span>
          <span className="brand-spark">.</span>
        </span>
      )}
    </span>
  );
}
