"use client";
import { useState } from "react";
import type { Locale } from "@/lib/config";
/** A locally rendered PNG: no third-party image or rendering provider receives the alias. */
export function PassportPrestigeDownload({
  publicId,
  locale,
}: {
  publicId: string;
  locale: Locale;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const es = locale === "es";
  async function download() {
    if (pending) return;
    setPending(true);
    setError("");
    let sourceUrl: string | undefined, downloadUrl: string | undefined;
    try {
      const response = await fetch(
        `/api/passports/prestige/${encodeURIComponent(publicId)}?lang=${locale}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("image/svg+xml")
      )
        throw new Error("Unavailable");
      sourceUrl = URL.createObjectURL(await response.blob());
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Image unavailable"));
        image.src = sourceUrl!;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.drawImage(image, 0, 0, 1200, 630);
      const png = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("PNG unavailable")),
          "image/png",
        ),
      );
      downloadUrl = URL.createObjectURL(png);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "akipasa-prestige.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError(
        es
          ? "No se pudo descargar. Revisa que el reconocimiento siga compartido e inténtalo de nuevo."
          : "Could not download. Check the award is still shared and retry.",
      );
    } finally {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      setPending(false);
    }
  }
  return (
    <>
      <button type="button" disabled={pending} onClick={download}>
        {pending
          ? es
            ? "Preparando…"
            : "Preparing…"
          : es
            ? "Descargar tarjeta PNG"
            : "Download PNG sharing card"}
      </button>
      <p role="status">{error}</p>
    </>
  );
}
