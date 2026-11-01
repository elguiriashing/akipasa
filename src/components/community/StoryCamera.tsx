"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./StoryCamera.module.css";
export type StoryLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  locatedAt: number;
};
export function freshStoryLocation(): Promise<StoryLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("location_required"));
    navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) => {
        if (
          ![
            coords.latitude,
            coords.longitude,
            coords.accuracy,
            timestamp,
          ].every(Number.isFinite) ||
          coords.latitude < -90 ||
          coords.latitude > 90 ||
          coords.longitude < -180 ||
          coords.longitude > 180 ||
          coords.accuracy < 0
        )
          return reject(new Error("location_required"));
        if (coords.accuracy > 50)
          return reject(new Error("location_inaccurate"));
        if (timestamp < Date.now() - 60000 || timestamp > Date.now() + 5000)
          return reject(new Error("location_expired"));
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          locatedAt: timestamp,
        });
      },
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? "location_required"
              : error.code === 3
                ? "location_timeout"
                : "location_unavailable",
          ),
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  });
}
function cameraFailureCode(error: unknown) {
  const name =
    error && typeof error === "object" && "name" in error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "camera_denied";
  if (name === "NotReadableError" || name === "TrackStartError")
    return "camera_busy";
  return "camera_unavailable";
}
export function storyLocationMessage(code: string, es: boolean) {
  if (code === "camera_denied")
    return es
      ? "La cámara está bloqueada. Permite su uso en los ajustes del navegador y vuelve a intentarlo, o continúa sin historia."
      : "Camera permission is blocked. Allow it in browser settings and try again, or continue without a story.";
  if (code === "camera_busy")
    return es
      ? "No se puede usar la cámara. Cierra otras aplicaciones o pestañas que la estén usando y vuelve a intentarlo, o continúa sin historia."
      : "The camera cannot be used. Close other apps or tabs using it and try again, or continue without a story.";
  if (code === "camera_unavailable")
    return es
      ? "No hay una cámara disponible en este navegador o dispositivo. Comprueba la conexión de la cámara y vuelve a intentarlo, o continúa sin historia."
      : "No camera is available in this browser or device. Check the camera connection and try again, or continue without a story.";
  if (code === "location_unavailable")
    return es
      ? "No se pudo obtener tu ubicación. Comprueba que la ubicación del dispositivo está activada y vuelve a intentarlo, o continúa sin historia."
      : "Your location could not be found. Check that device location is enabled and try again, or continue without a story.";
  if (code === "location_timeout")
    return es
      ? "La ubicación tardó demasiado. Busca un lugar con mejor señal y vuelve a intentarlo, o continúa sin historia."
      : "Location took too long. Move somewhere with a better signal and try again, or continue without a story.";
  if (code === "outside_geofence")
    return es
      ? "Acércate al local para hacer la foto (a menos de 100 m)."
      : "Move within 100 m of the venue to take your photo.";
  if (code === "location_inaccurate")
    return es
      ? "Necesitamos una ubicación más precisa (50 m o mejor). Activa la ubicación precisa e inténtalo de nuevo."
      : "A more precise location is needed (50 m or better). Enable precise location and try again.";
  if (code === "location_expired")
    return es
      ? "Tu ubicación ha caducado. Vuelve a intentarlo para obtener una nueva."
      : "Your location expired. Try again for a fresh fix.";
  if (code === "location_required")
    return es
      ? "Permite la ubicación precisa en los ajustes del navegador y vuelve a intentarlo, o continúa sin historia."
      : "Allow precise location in browser settings and try again, or continue without a story.";
  if (code === "not_eligible")
    return es
      ? "Este check-in no está disponible para compartir una foto."
      : "This check-in is not eligible for photo sharing.";
  return es
    ? "No se pudo preparar la cámara y verificar tu ubicación. Revisa los permisos e inténtalo de nuevo, o continúa sin historia."
    : "Camera and location could not be prepared. Check permissions and try again, or continue without a story.";
}
export function StoryCamera({
  locale,
  checkInId,
  facing,
  disabled,
  onCapture,
}: {
  locale: "en" | "es";
  checkInId: string;
  facing: "user" | "environment";
  disabled: boolean;
  onCapture: (file: File) => void;
}) {
  const es = locale === "es";
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const [phase, setPhase] = useState<
    "idle" | "starting" | "ready" | "capturing" | "error"
  >("idle");
  const [error, setError] = useState("");
  const stop = useCallback(() => {
    generation.current++;
    pending.current = false;
    request.current?.abort();
    request.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);
  useEffect(() => {
    stop();
    setPhase("idle");
    setError("");
    return stop;
  }, [checkInId, facing, stop]);
  useEffect(() => {
    if (disabled) {
      stop();
      setPhase("idle");
    }
  }, [disabled, stop]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        stop();
        setPhase("idle");
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      stop();
    };
  }, [stop]);
  async function start() {
    if (disabled || pending.current || stream.current || document.hidden)
      return;
    stop();
    const current = generation.current;
    pending.current = true;
    setPhase("starting");
    setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("camera_unavailable");
      await Promise.all([
        navigator.mediaDevices
          .getUserMedia({
            audio: false,
            video: { facingMode: { ideal: facing } },
          })
          .catch((error: unknown) => {
            throw new Error(cameraFailureCode(error));
          })
          .then(async (media) => {
            if (generation.current !== current || document.hidden) {
              media.getTracks().forEach((t) => t.stop());
              throw new Error("cancelled");
            }
            stream.current = media;
            if (!video.current) throw new Error("camera_unavailable");
            video.current.srcObject = media;
            try {
              await video.current.play();
            } catch (error) {
              throw new Error(cameraFailureCode(error));
            }
          }),
        freshStoryLocation().then(async (location) => {
          if (generation.current !== current) throw new Error("cancelled");
          const response = await fetch(
            "/api/community/stories/capture-location",
            {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ checkInId, ...location }),
              signal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(20000),
              ]),
            },
          );
          const body = await response.json();
          if (!response.ok || body.ready !== true)
            throw new Error(body.error?.code || "unavailable");
        }),
      ]);
      if (generation.current !== current || document.hidden) return;
      pending.current = false;
      setPhase("ready");
    } catch (e) {
      if (generation.current !== current) return;
      stop();
      setError(e instanceof Error ? e.message : "unavailable");
      setPhase("error");
    }
  }
  async function capture() {
    if (phase !== "ready" || disabled || !video.current || !stream.current)
      return;
    const current = generation.current;
    setPhase("capturing");
    try {
      const element = video.current;
      if (element.readyState < 2 || !element.videoWidth || !element.videoHeight)
        throw new Error("camera_unavailable");
      const canvas = document.createElement("canvas");
      const scale = Math.min(
        1,
        1280 / Math.max(element.videoWidth, element.videoHeight),
      );
      canvas.width = Math.max(1, Math.round(element.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(element.videoHeight * scale));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("camera_unavailable");
      context.drawImage(element, 0, 0, canvas.width, canvas.height);
      // Freeze the shutter frame now, then release hardware while obtaining a
      // new fix. Closing/backgrounding still invalidates this request generation.
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      element.srcObject = null;
      const controller = new AbortController();
      request.current?.abort();
      request.current = controller;
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("camera_unavailable"))),
          "image/jpeg",
          0.9,
        ),
      );
      if (generation.current !== current || document.hidden) return;
      const location = await freshStoryLocation();
      if (generation.current !== current || document.hidden) return;
      const response = await fetch("/api/community/stories/capture-location", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkInId, ...location }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(20000),
        ]),
      });
      const body = await response.json();
      if (generation.current !== current || document.hidden) return;
      if (!response.ok || body.ready !== true)
        throw new Error(body.error?.code || "unavailable");
      stop();
      setPhase("idle");
      onCapture(
        new File([blob], "fresh-camera-photo.jpg", { type: "image/jpeg" }),
      );
    } catch (e) {
      if (generation.current !== current) return;
      stop();
      setError(e instanceof Error ? e.message : "unavailable");
      setPhase("error");
    }
  }
  return (
    <section
      className={styles.camera}
      aria-label={es ? "Cámara de historias" : "Story camera"}
    >
      <video
        ref={video}
        playsInline
        muted
        autoPlay
        className={styles.video}
        aria-label={
          es ? "Vista previa de la cámara de historias" : "Story camera preview"
        }
        hidden={
          phase !== "starting" && phase !== "ready" && phase !== "capturing"
        }
      />
      {phase === "starting" && (
        <p role="status">{es ? "Preparando…" : "Preparing…"}</p>
      )}
      {phase === "ready" && (
        <p role="status">
          {es ? "Lista para hacer la foto." : "Ready to take your photo."}
        </p>
      )}
      {phase === "capturing" && (
        <p role="status">
          {es ? "Comprobando ubicación…" : "Checking location…"}
        </p>
      )}
      {phase === "error" && (
        <p role="alert">{storyLocationMessage(error, es)}</p>
      )}
      <div className={styles.actions}>
        {phase === "idle" || phase === "error" ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => void start()}
          >
            {es ? "Abrir cámara" : "Open camera"}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={phase !== "ready" || disabled}
              onClick={() => void capture()}
            >
              {es ? "Hacer foto" : "Take photo"}
            </button>
            <button
              type="button"
              onClick={() => {
                stop();
                setPhase("idle");
              }}
            >
              {es ? "Cerrar cámara" : "Close camera"}
            </button>
          </>
        )}
      </div>
      <details>
        <summary>{es ? "Cámara y privacidad" : "Camera & privacy"}</summary>
        <p>
          {es
            ? "Necesitamos la cámara y tu ubicación precisa para comprobar que estás cerca del local. Tu GPS exacto no se guarda. El navegador decide si recuerda tus permisos."
            : "Camera and precise location are needed to check you are near the venue. Your exact GPS is not stored. Your browser controls whether permissions are remembered."}
        </p>
      </details>
    </section>
  );
}
