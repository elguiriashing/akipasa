"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { verifiedVenueQrPath } from "@/lib/checkin-scan";
import { createCheckInFrameReader } from "@/lib/checkin-frame-reader";

type ScanResult = { rawValue: string };
type BarcodeReader = {
  detect: (source: HTMLVideoElement) => Promise<ScanResult[]>;
};
type BarcodeFactory = new (options: { formats: string[] }) => BarcodeReader;

export function CheckInScanner({ locale }: { locale: "en" | "es" }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const camera = useRef<MediaStream | null>(null);
  const frame = useRef<number | null>(null);
  const generation = useRef(0);
  const requesting = useRef(false);
  const [status, setStatus] = useState<
    "idle" | "requesting" | "scanning" | "unsupported" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const es = locale === "es";

  const stop = useCallback(() => {
    generation.current++;
    requesting.current = false;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    camera.current?.getTracks().forEach((track) => track.stop());
    camera.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        stop();
        setStatus("idle");
        setMessage("");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [stop]);

  async function start() {
    if (requesting.current || camera.current || document.hidden) return;
    const Factory = (window as Window & { BarcodeDetector?: BarcodeFactory })
      .BarcodeDetector;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setMessage(
        es
          ? "Tu navegador no admite el escáner integrado. Usa la cámara del móvil para abrir el QR oficial del local."
          : "Your browser does not support in-app scanning. Use your phone camera to open the venue's official QR code.",
      );
      return;
    }
    stop();
    const request = generation.current;
    requesting.current = true;
    setStatus("requesting");
    setMessage(
      es ? "Esperando permiso de cámara…" : "Waiting for camera permission…",
    );
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      if (generation.current !== request || document.hidden) {
        stream.getTracks().forEach((track) => track.stop());
        if (generation.current === request) {
          stop();
          setStatus("idle");
          setMessage("");
        }
        return;
      }
      camera.current = stream;
      const element = video.current;
      if (!element) {
        stop();
        return;
      }
      element.srcObject = stream;
      await element.play();
      if (generation.current !== request) return;
      if (document.hidden) {
        stop();
        setStatus("idle");
        setMessage("");
        return;
      }
      requesting.current = false;
      const reader = createCheckInFrameReader(Factory);
      setStatus("scanning");
      setMessage(
        es
          ? "Apunta al QR oficial del local."
          : "Point the camera at the venue's official QR.",
      );
      let busy = false;
      let nextFrameAt = 0;
      let errors = 0;
      const startedAt = Date.now();
      const scan = async () => {
        if (
          busy ||
          generation.current !== request ||
          document.hidden ||
          !camera.current ||
          !video.current
        )
          return;
        if (Date.now() < nextFrameAt) {
          frame.current = requestAnimationFrame(scan);
          return;
        }
        nextFrameAt = Date.now() + 200;
        busy = true;
        try {
          const detected = await reader.detect(video.current);
          errors = 0;
          if (generation.current !== request || document.hidden) return;
          const target = detected
            .map((item) =>
              verifiedVenueQrPath(item.rawValue, location.origin, locale),
            )
            .find(Boolean);
          if (target) {
            stop();
            router.push(target);
            return;
          }
          if (detected.length) {
            setMessage(
              es
                ? "Este no es un QR de check-in válido de AkiPasa. Usa el QR oficial del local."
                : "This is not a valid AkiPasa check-in QR. Use the venue’s official QR.",
            );
          } else if (Date.now() - startedAt > 8000) {
            setMessage(
              es
                ? "No se ha leído ningún QR. Acércate, evita reflejos y mantén el código completo dentro de la cámara."
                : "No QR read yet. Move closer, avoid reflections and keep the whole code in the camera.",
            );
          }
        } catch {
          if (generation.current !== request || document.hidden) return;
          errors++;
          if (errors >= 3) {
            stop();
            setStatus("error");
            setMessage(
              es
                ? "No se pudo leer la cámara. Inténtalo de nuevo o abre el QR con la cámara del móvil."
                : "Camera decoding failed. Try again or open the QR with your phone’s camera.",
            );
            return;
          }
        } finally {
          busy = false;
        }
        if (
          generation.current === request &&
          camera.current &&
          !document.hidden
        )
          frame.current = requestAnimationFrame(scan);
      };
      frame.current = requestAnimationFrame(scan);
    } catch {
      if (generation.current !== request) return;
      stop();
      setStatus("error");
      setMessage(
        es
          ? "No se pudo activar la cámara. Revisa los permisos o escanea el código con la cámara del móvil."
          : "Camera unavailable. Check permission settings or scan with your phone's camera.",
      );
    }
  }

  return (
    <section
      className="pasa-checkin-scanner"
      aria-label={es ? "Escáner de check-in" : "Check-in scanner"}
    >
      <div className="pasa-checkin-scanner__frame">
        <video
          ref={video}
          playsInline
          muted
          autoPlay
          aria-label={es ? "Vista previa de cámara" : "Camera preview"}
        />
      </div>
      <div className="pasa-checkin-scanner__actions">
        {status === "scanning" || status === "requesting" ? (
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              stop();
              setStatus("idle");
              setMessage("");
            }}
          >
            {status === "requesting"
              ? es
                ? "Cancelar cámara"
                : "Cancel camera"
              : es
                ? "Detener escáner"
                : "Stop scanner"}
          </button>
        ) : (
          <button type="button" className="button" onClick={start}>
            {es ? "Escanear QR del local" : "Scan venue QR"}
          </button>
        )}
        <p role="status" aria-live="polite">
          {message}
        </p>
      </div>
    </section>
  );
}
