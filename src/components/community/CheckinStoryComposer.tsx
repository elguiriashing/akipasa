"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import NextImage from "next/image";
import {
  StoryCamera,
  freshStoryLocation,
  storyLocationMessage,
} from "./StoryCamera";
import { checkPhotoQuality } from "@/lib/community-stories/photo-quality";
import styles from "./CheckinStoryComposer.module.css";

const INPUT_LIMIT = 10 * 1024 * 1024;
const OUTPUT_LIMIT = 5 * 1024 * 1024;
const MAX_SIDE = 1280;
const ACCEPT = "image/jpeg,image/png,image/webp";
type Kind = "selfie" | "venue";
type StoryStatus = "pending" | "approved" | "rejected";
export type CheckinStoryReceipt = {
  id: string;
  status: StoryStatus;
  expiresAt: string;
};

/** Some browsers add ICCP/VP8X even for an opaque canvas. Keep only its one static image chunk. */
async function canonicalCanvasWebP(blob: Blob): Promise<Blob> {
  const buffer =
    typeof blob.arrayBuffer === "function"
      ? await blob.arrayBuffer()
      : await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(new Error("invalid_image"));
          reader.readAsArrayBuffer(blob);
        });
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const tag = (at: number) =>
    String.fromCharCode(...bytes.subarray(at, at + 4));
  if (
    bytes.length < 20 ||
    tag(0) !== "RIFF" ||
    tag(8) !== "WEBP" ||
    view.getUint32(4, true) + 8 !== bytes.length
  )
    throw new Error("invalid_image");
  let image: Uint8Array | null = null;
  for (let at = 12; at < bytes.length; ) {
    if (at + 8 > bytes.length) throw new Error("invalid_image");
    const kind = tag(at),
      length = view.getUint32(at + 4, true),
      end = at + 8 + length + (length % 2);
    if (!length || end > bytes.length) throw new Error("invalid_image");
    if (kind === "VP8 " || kind === "VP8L") {
      if (image) throw new Error("invalid_image");
      if (
        kind === "VP8L" &&
        (length < 5 || (view.getUint32(at + 9, true) & 0x10000000) !== 0)
      )
        throw new Error("invalid_image");
      image = bytes.slice(at, end);
    } else if (kind === "VP8X") {
      if (length !== 10 || (bytes[at + 8] & 0x12) !== 0)
        throw new Error("invalid_image");
    } else if (!["ICCP", "EXIF", "XMP "].includes(kind))
      throw new Error("invalid_image");
    at = end;
  }
  if (!image) throw new Error("invalid_image");
  const result = new Uint8Array(12 + image.length);
  result.set([82, 73, 70, 70], 0);
  new DataView(result.buffer).setUint32(4, result.length - 8, true);
  result.set([87, 69, 66, 80], 8);
  result.set(image, 12);
  return new Blob([result], { type: "image/webp" });
}

/** Draw pixels onto an opaque new canvas; original filenames and metadata never leave this step. */
export async function prepareCheckinStoryPhoto(file: File): Promise<File> {
  if (
    !ACCEPT.split(",").includes(file.type) ||
    !file.size ||
    file.size > INPUT_LIMIT
  )
    throw new Error("invalid_image");
  let source: CanvasImageSource;
  let width: number;
  let height: number;
  let release: () => void;
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    source = bitmap;
    width = bitmap.width;
    height = bitmap.height;
    release = () => bitmap.close();
  } else {
    const url = URL.createObjectURL(file);
    const image = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("invalid_image"));
        image.src = url;
      });
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
    source = image;
    width = image.naturalWidth;
    height = image.naturalHeight;
    release = () => {
      image.src = "";
      URL.revokeObjectURL(url);
    };
  }
  try {
    if (
      !width ||
      !height ||
      width > 16384 ||
      height > 16384 ||
      width * height > 48_000_000
    )
      throw new Error("invalid_image");
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("invalid_image");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const qualityCanvas = document.createElement("canvas");
    const qualityScale = Math.min(
      1,
      640 / Math.max(canvas.width, canvas.height),
    );
    qualityCanvas.width = Math.max(1, Math.round(canvas.width * qualityScale));
    qualityCanvas.height = Math.max(
      1,
      Math.round(canvas.height * qualityScale),
    );
    const qualityContext = qualityCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!qualityContext) throw new Error("photo_check_unavailable");
    qualityContext.drawImage(
      canvas,
      0,
      0,
      qualityCanvas.width,
      qualityCanvas.height,
    );
    const pixels = qualityContext.getImageData(
      0,
      0,
      qualityCanvas.width,
      qualityCanvas.height,
    );
    const qualityError = await checkPhotoQuality(
      pixels.data,
      pixels.width,
      pixels.height,
    );
    if (qualityError) throw new Error(qualityError);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(new Error("invalid_image")),
        "image/webp",
        0.84,
      ),
    );
    if (
      blob.type !== "image/webp" ||
      blob.size === 0 ||
      blob.size > OUTPUT_LIMIT
    )
      throw new Error("invalid_image");
    const canonical = await canonicalCanvasWebP(blob);
    return new File([canonical], "checkin-story.webp", { type: "image/webp" });
  } finally {
    release();
  }
}

export function CheckinStoryComposer({
  locale,
  checkInId,
  venueName,
  existingStory,
}: {
  locale: "en" | "es";
  checkInId: string;
  venueName: string;
  existingStory?: CheckinStoryReceipt | null;
}) {
  const es = locale === "es";
  const [kind, setKind] = useState<Kind>("venue");
  const [caption, setCaption] = useState("");
  const [publicOptIn, setPublicOptIn] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [phase, setPhase] = useState<
    "idle" | "preparing" | "submitting" | "error"
  >("idle");
  const [errorCode, setErrorCode] = useState("");
  const [receipt, setReceipt] = useState(existingStory ?? null);
  const sequence = useRef({ generation: 0 });
  const previewRef = useRef("");
  const abort = useRef<AbortController | null>(null);
  const activeCheckIn = useRef(checkInId);
  const submitting = useRef(false);
  useEffect(() => {
    const lifecycle = sequence.current;
    activeCheckIn.current = checkInId;
    sequence.current.generation++;
    abort.current?.abort();
    submitting.current = false;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPreview("");
    setFile(null);
    setCaption("");
    setPublicOptIn(false);
    setPhase("idle");
    setErrorCode("");
    setReceipt(existingStory ?? null);
    return () => {
      lifecycle.generation++;
      abort.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = "";
    };
  }, [checkInId, existingStory]);
  const busy = phase === "preparing" || phase === "submitting";
  const choosePhoto = async (selected: File) => {
    if (busy || receipt) return;
    const request = ++sequence.current.generation;
    setFile(null);
    setPublicOptIn(false);
    setPhase("preparing");
    setErrorCode("");
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPreview("");
    try {
      const sanitized = await prepareCheckinStoryPhoto(selected);
      if (request !== sequence.current.generation) return;
      const url = URL.createObjectURL(sanitized);
      previewRef.current = url;
      setPreview(url);
      setFile(sanitized);
      setPhase("idle");
    } catch (error) {
      if (request === sequence.current.generation) {
        setErrorCode(error instanceof Error ? error.message : "invalid_image");
        setPhase("error");
      }
    }
  };
  const removePhoto = () => {
    if (busy || receipt) return;
    sequence.current.generation++;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPreview("");
    setFile(null);
    setPublicOptIn(false);
    setErrorCode("");
    setPhase("idle");
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !file ||
      !publicOptIn ||
      busy ||
      submitting.current ||
      receipt ||
      activeCheckIn.current !== checkInId
    )
      return;
    submitting.current = true;
    const request = ++sequence.current.generation;
    const controller = new AbortController();
    abort.current = controller;
    setPhase("submitting");
    setErrorCode("");
    const body = new FormData();
    body.set("checkInId", checkInId);
    body.set("kind", kind);
    body.set("caption", caption.trim());
    body.set("publicOptIn", "true");
    body.set("file", file);
    try {
      const location = await freshStoryLocation();
      if (request !== sequence.current.generation || controller.signal.aborted)
        return;
      for (const [key, value] of Object.entries(location))
        body.set(key, String(value));
      const response = await fetch("/api/community/stories", {
        method: "POST",
        credentials: "same-origin",
        body,
        signal: controller.signal,
      });
      const data = await response.json();
      if (request !== sequence.current.generation || controller.signal.aborted)
        return;
      if (!response.ok)
        throw new Error(
          typeof data?.error?.code === "string"
            ? data.error.code
            : "unavailable",
        );
      if (
        response.status !== 201 ||
        data?.moderation !== "manual" ||
        data?.story?.status !== "pending" ||
        typeof data.story.id !== "string" ||
        typeof data.story.expiresAt !== "string"
      )
        throw new Error("unavailable");
      setReceipt({
        id: data.story.id,
        status: "pending",
        expiresAt: data.story.expiresAt,
      });
      setPhase("idle");
      setFile(null);
      setPublicOptIn(false);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = "";
      setPreview("");
    } catch (error) {
      if (request !== sequence.current.generation || controller.signal.aborted)
        return;
      setErrorCode(error instanceof Error ? error.message : "unavailable");
      setPhase("error");
    } finally {
      if (request === sequence.current.generation) submitting.current = false;
    }
  };
  const errorText = [
    "location_required",
    "location_unavailable",
    "location_timeout",
    "location_inaccurate",
    "location_expired",
    "outside_geofence",
  ].includes(errorCode)
    ? storyLocationMessage(errorCode, es)
    : errorCode === "blank_photo"
      ? es
        ? "La foto está demasiado oscura o uniforme. Haz otra con luz y detalles del local."
        : "This photo is too dark or plain. Take another with light and venue detail."
      : errorCode === "qr_photo"
        ? es
          ? "La foto contiene un código QR. Haz una foto del local, el ambiente o la comida."
          : "This photo contains a QR code. Photograph the venue, atmosphere or food instead."
        : errorCode === "photo_check_unavailable"
          ? es
            ? "No se pudo comprobar la foto. Vuelve a hacerla antes de compartir."
            : "The photo could not be checked. Take another before sharing."
          : errorCode === "invalid_image"
            ? es
              ? "No se pudo preparar la foto de la cámara. Haz otra e inténtalo de nuevo."
              : "The camera photo could not be prepared. Take another and try again."
            : errorCode === "already_shared"
              ? es
                ? "Este check-in ya tiene una historia. No se ha creado otra."
                : "This check-in already has a story. Another was not created."
              : errorCode === "rate_limited"
                ? es
                  ? "Has enviado varias historias. Espera antes de volver a intentarlo."
                  : "You have sent several stories. Wait before trying again."
                : errorCode === "authentication_required"
                  ? es
                    ? "Tu sesión ha caducado. Inicia sesión de nuevo antes de compartir."
                    : "Your session has expired. Sign in again before sharing."
                  : errorCode === "not_eligible"
                    ? es
                      ? "Este check-in no está disponible para compartir. Necesitas un check-in verificado propio de las últimas 24 horas."
                      : "This check-in is not eligible to share. You need your own verified check-in from the last 24 hours."
                    : es
                      ? "No se ha podido enviar la historia. Tu foto sigue aquí; puedes reintentar."
                      : "Your story could not be sent. Your photo is still here; you can retry.";
  return (
    <section
      className={styles.composer}
      aria-label={
        es ? "Compartir un momento del check-in" : "Share a check-in moment"
      }
    >
      <header>
        <span className={styles.eyebrow}>
          {es ? "TU MOMENTO, TU DECISIÓN" : "YOUR MOMENT, YOUR CHOICE"}
        </span>
        <h2>{es ? "Comparte tu momento" : "Share your moment"}</h2>
        <p>{venueName}</p>
      </header>
      <p>
        {es
          ? "Opcional: añade una foto de este check-in verificado. Hacer o compartir una foto no añade XP ni confirma otra visita."
          : "Optional: add a photo from this verified check-in. Taking or sharing a photo adds no XP and does not verify another visit."}
      </p>
      {!receipt && (
        <p className={styles.hint}>
          {es
            ? "El escáner QR no guarda ni adjunta imágenes a tu historia. Haz una foto nueva del local, su ambiente o la comida; evita códigos QR y pantallas. Si aparecen otras personas, pide su permiso. Una foto no demuestra que hayas visitado el local."
            : "The QR scanner does not save or attach images to your story. Take a fresh photo of the venue, atmosphere or food; avoid QR codes and screens. Ask permission from other people shown. A photo does not prove you visited the venue."}
        </p>
      )}
      {receipt ? (
        <div className={styles.receipt} role="status">
          <strong>
            {receipt.status === "approved"
              ? es
                ? "Historia aprobada"
                : "Story approved"
              : receipt.status === "rejected"
                ? es
                  ? "Historia no publicada"
                  : "Story not published"
                : es
                  ? "Pendiente de revisión"
                  : "Awaiting review"}
          </strong>
          <p>
            {receipt.status === "approved"
              ? es
                ? "Tu historia está aprobada para las historias de la ciudad hasta que caduque. No muestra tu ubicación exacta."
                : "Your story is approved for city stories until it expires. Your exact location is not shown."
              : receipt.status === "rejected"
                ? es
                  ? "La revisión no ha aprobado esta historia. No se publica en las historias de la ciudad."
                  : "Review did not approve this story. It is not published in city stories."
                : es
                  ? "Se revisará antes de publicarse. Enviar una foto no garantiza su publicación. Caduca 24 horas después del envío."
                  : "It will be reviewed before publication. Sending a photo does not guarantee publication. It expires 24 hours after submission."}
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className={styles.form}>
          <fieldset disabled={busy}>
            <legend>{es ? "Tipo de foto" : "Photo type"}</legend>
            <div className={styles.kinds}>
              {(["venue", "selfie"] as const).map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="story-kind"
                    value={value}
                    checked={kind === value}
                    onChange={() => setKind(value)}
                  />
                  {value === "venue"
                    ? es
                      ? "El lugar"
                      : "The venue"
                    : "Selfie"}
                </label>
              ))}
            </div>
          </fieldset>
          <StoryCamera
            locale={locale}
            checkInId={checkInId}
            facing={kind === "selfie" ? "user" : "environment"}
            disabled={busy}
            onCapture={(photo) => void choosePhoto(photo)}
          />
          <p className={styles.hint}>
            {es
              ? "Nada se envía hasta que revises la vista previa, marques tu permiso y pulses Enviar a revisión. Volvemos a comprobar tu ubicación al enviar. Puedes continuar sin compartir una historia."
              : "Nothing is sent until you review the preview, give permission and select Submit for review. We check your location again when you submit. You can continue without sharing a story."}
          </p>
          {phase === "preparing" && (
            <p role="status">
              {es
                ? "Preparando una copia segura de tu foto…"
                : "Preparing a safe copy of your photo…"}
            </p>
          )}
          {preview && (
            <>
              <h3>{es ? "Revisa tu foto" : "Review your photo"}</h3>
              <NextImage
                unoptimized
                width={1280}
                height={1280}
                className={styles.preview}
                src={preview}
                alt={
                  es
                    ? "Vista previa de la foto que has elegido"
                    : "Preview of your chosen photo"
                }
              />
              <p className={styles.hint}>
                {es
                  ? "¿Quieres cambiarla? Abre la cámara de nuevo. La nueva foto necesitará tu permiso para compartir."
                  : "Want to change it? Open the camera again. A replacement photo needs your permission to share."}
              </p>
              <button type="button" disabled={busy} onClick={removePhoto}>
                {es ? "Quitar foto" : "Remove photo"}
              </button>
            </>
          )}
          <label className={styles.caption}>
            {es ? "Texto (opcional)" : "Caption (optional)"}
            <textarea
              aria-label={es ? "Texto (opcional)" : "Caption (optional)"}
              value={caption}
              maxLength={240}
              disabled={busy}
              onChange={(event) => setCaption(event.target.value)}
            />
            <small>{caption.length}/240</small>
          </label>
          <label className={styles.optIn}>
            <input
              type="checkbox"
              checked={publicOptIn}
              disabled={busy}
              onChange={(event) => setPublicOptIn(event.target.checked)}
            />
            <span>
              {es
                ? "Quiero compartir esta foto públicamente en las historias de la ciudad durante un máximo de 24 horas, solo si se aprueba la revisión."
                : "I want to share this photo publicly in city stories for up to 24 hours, only if review approves it."}
            </span>
          </label>
          <p className={styles.hint}>
            {es
              ? "Comparte solo fotos que puedas publicar y respeta a las personas que aparecen. Eliminamos los metadatos de la copia enviada. No se publica tu GPS exacto."
              : "Only share photos you may publish, and respect people shown in them. We remove metadata from the uploaded copy. Your exact GPS is not published."}
          </p>
          {phase === "error" && (
            <p role="alert" className={styles.error}>
              {errorText}
            </p>
          )}
          <button
            className={styles.submit}
            type="submit"
            disabled={busy || !file || !publicOptIn}
          >
            {phase === "submitting"
              ? es
                ? "Enviando…"
                : "Sending…"
              : phase === "error" && file
                ? es
                  ? "Reintentar envío"
                  : "Retry submission"
                : es
                  ? "Enviar a revisión"
                  : "Submit for review"}
          </button>
        </form>
      )}
    </section>
  );
}
