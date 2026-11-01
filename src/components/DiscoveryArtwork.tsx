/* eslint-disable @next/next/no-img-element -- Signed Supabase media uses native image loading/error handling. */
"use client";

import { useState } from "react";
import styles from "./DiscoveryArtwork.module.css";

type ArtworkProps = {
  src?: string | null;
  alt: string;
  contain?: boolean;
};

/** Each source gets its own error state, including retries after changing URLs. */
export function DiscoveryArtwork({ src, ...props }: ArtworkProps) {
  const source = src?.trim() || undefined;
  return <ArtworkSource key={source || "no-artwork"} src={source} {...props} />;
}

function ArtworkSource({ src, alt, contain = false }: ArtworkProps) {
  const [failed, setFailed] = useState(false);
  const photo = Boolean(src && !failed);
  return (
    <span
      className={styles.artwork}
      data-artwork={photo ? "photo" : "placeholder"}
    >
      <img
        key={photo ? src : "storefront"}
        className={photo ? styles.image : styles.placeholder}
        src={photo ? src! : "/explore-storefront-placeholder.svg"}
        alt={photo ? alt : ""}
        aria-hidden={photo ? undefined : true}
        loading="lazy"
        decoding="async"
        style={photo && contain ? { objectFit: "contain" } : undefined}
        onError={photo ? () => setFailed(true) : undefined}
      />
    </span>
  );
}
