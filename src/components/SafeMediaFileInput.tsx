"use client";

import { useState, type ChangeEvent } from "react";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_PDF_PAGES = 20;
const MAX_RENDER_HEIGHT = 14_000;
const MAX_RENDER_WIDTH = 1_600;

let pdfWorker: Worker | null = null;

function setSubmitDisabled(input: HTMLInputElement, disabled: boolean) {
  input
    .closest("form")
    ?.querySelectorAll<HTMLButtonElement>('button[type="submit"]')
    .forEach((button) => {
      button.disabled = disabled;
      button.setAttribute("aria-disabled", disabled ? "true" : "false");
    });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("image_conversion_failed"));
      },
      "image/jpeg",
      quality,
    );
  });
}

async function renderPdfAsSafeJpeg(file: File) {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfWorker) {
    pdfWorker = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
  }
  pdfjs.GlobalWorkerOptions.workerPort = pdfWorker;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    enableXfa: false,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;

  if (pdf.numPages < 1 || pdf.numPages > MAX_PDF_PAGES) {
    await pdf.destroy();
    throw new Error("pdf_page_limit");
  }

  const pages: Array<{
    page: Awaited<ReturnType<typeof pdf.getPage>>;
    width: number;
    height: number;
  }> = [];
  let maxWidth = 0;
  let totalHeight = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    pages.push({ page, width: viewport.width, height: viewport.height });
    maxWidth = Math.max(maxWidth, viewport.width);
    totalHeight += viewport.height;
  }

  const gap = 14;
  const availableHeight =
    MAX_RENDER_HEIGHT - Math.max(0, pages.length - 1) * gap;
  const scale = Math.min(
    2,
    MAX_RENDER_WIDTH / Math.max(maxWidth, 1),
    availableHeight / Math.max(totalHeight, 1),
  );

  const outputWidth = Math.max(1, Math.round(maxWidth * scale));
  const renderedHeights = pages.map((item) =>
    Math.max(1, Math.round(item.height * scale)),
  );
  const outputHeight =
    renderedHeights.reduce((sum, height) => sum + height, 0) +
    Math.max(0, pages.length - 1) * gap;

  const output = document.createElement("canvas");
  output.width = outputWidth;
  output.height = outputHeight;
  const outputContext = output.getContext("2d", { alpha: false });
  if (!outputContext) {
    await pdf.destroy();
    throw new Error("canvas_unavailable");
  }
  outputContext.fillStyle = "#ffffff";
  outputContext.fillRect(0, 0, output.width, output.height);

  let offsetY = 0;
  for (let index = 0; index < pages.length; index += 1) {
    const item = pages[index];
    const viewport = item.page.getViewport({ scale });
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = Math.max(1, Math.round(viewport.width));
    pageCanvas.height = Math.max(1, Math.round(viewport.height));
    const pageContext = pageCanvas.getContext("2d", { alpha: false });
    if (!pageContext) {
      await pdf.destroy();
      throw new Error("canvas_unavailable");
    }
    pageContext.fillStyle = "#ffffff";
    pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    await item.page.render({
      canvas: pageCanvas,
      viewport,
    }).promise;

    const x = Math.max(0, Math.round((outputWidth - pageCanvas.width) / 2));
    outputContext.drawImage(pageCanvas, x, offsetY);
    offsetY += pageCanvas.height + gap;
    item.page.cleanup();
  }

  await pdf.destroy();

  let blob = await canvasToBlob(output, 0.88);
  if (blob.size > 9.5 * 1024 * 1024) {
    blob = await canvasToBlob(output, 0.7);
  }
  if (blob.size > 10 * 1024 * 1024) {
    throw new Error("converted_file_too_large");
  }

  const baseName = file.name.replace(/\.pdf$/i, "").slice(0, 120) || "document";
  return new File([blob], `${baseName}-sanitized.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export function SafeMediaFileInput({
  locale,
  name,
  required = false,
}: {
  locale: "es" | "en";
  name: string;
  required?: boolean;
}) {
  const es = locale === "es";
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setStatus("");
    setError("");
    if (!file) return;

    if (file.size > MAX_INPUT_BYTES) {
      input.value = "";
      setError(es ? "El archivo supera 10 MB." : "The file is larger than 10 MB.");
      return;
    }

    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) return;

    setSubmitDisabled(input, true);
    setStatus(
      es
        ? "Convirtiendo el PDF a una imagen segura…"
        : "Converting the PDF to a safe image…",
    );

    try {
      const safeFile = await renderPdfAsSafeJpeg(file);
      const transfer = new DataTransfer();
      transfer.items.add(safeFile);
      input.files = transfer.files;
      setStatus(
        es
          ? "PDF convertido. Solo se subirá la imagen resultante; enlaces y contenido interactivo no se conservan."
          : "PDF converted. Only the rendered image will be uploaded; links and interactive content are discarded.",
      );
    } catch (conversionError) {
      input.value = "";
      setStatus("");
      setError(
        conversionError instanceof Error &&
          conversionError.message === "pdf_page_limit"
          ? es
            ? `El PDF debe tener entre 1 y ${MAX_PDF_PAGES} páginas.`
            : `PDFs must contain between 1 and ${MAX_PDF_PAGES} pages.`
          : es
            ? "No se pudo convertir el PDF. Prueba con otro PDF o una imagen."
            : "The PDF could not be converted. Try another PDF or an image.",
      );
    } finally {
      setSubmitDisabled(input, false);
    }
  }

  return (
    <span className="safe-media-file-input">
      <input
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
        required={required}
        onChange={handleChange}
      />
      {status && <small className="safe-media-status">{status}</small>}
      {error && (
        <small className="safe-media-status error" role="alert">
          {error}
        </small>
      )}
    </span>
  );
}
