/* eslint-disable @next/next/no-img-element -- Signed Supabase media uses native image loading/error handling. */
"use client";

import { useState } from "react";
import styles from "./DiscoveryArtwork.module.css";

/** A real image covers the illustration only after a usable URL is supplied.
 * Failed/expired signed URLs fall back without broken-image icons. */
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
    <span className={styles.artwork} data-artwork={visible ? "photo" : "placeholder"}>
      <span className={styles.placeholder} aria-hidden="true" />
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
      ) : null}
    </span>
  );
}
