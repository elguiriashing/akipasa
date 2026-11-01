/* eslint-disable @next/next/no-img-element -- Signed Supabase media uses native image loading/error handling. */
"use client";

import { useState } from "react";
import styles from "./DiscoveryArtwork.module.css";

/** Photography and fallback artwork are mutually exclusive. Transparent uploads
 * reveal only the theme's solid canvas; failed URLs show the storefront. */
export function DiscoveryArtwork({
  src,
  alt,
  contain = false,
}: {
  src?: string | null;
  alt: string;
  contain?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const visible = Boolean(src && failedSrc !== src);
  return (
    <span
      className={styles.artwork}
      data-artwork={visible ? "photo" : "placeholder"}
    >
      {visible ? (
        <img
          key={src}
          src={src!}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={styles.image}
          style={contain ? { objectFit: "contain" } : undefined}
          onError={() => setFailedSrc(src!)}
        />
      ) : (
        <img
          className={styles.placeholder}
          src="/explore-storefront-placeholder.svg"
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
      )}
    </span>
  );
}
