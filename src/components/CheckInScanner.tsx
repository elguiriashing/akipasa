"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ScanResult = { rawValue: string };
type BarcodeReader = { detect: (source: HTMLVideoElement) => Promise<ScanResult[]> };
type BarcodeFactory = new (options: { formats: string[] }) => BarcodeReader;

function verifiedVenuePath(raw: string, origin: string, locale: "en" | "es") {
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return null;
    if (!new RegExp(`^/${locale}/check-in/[0-9a-f-]{36}$`, "i").test(url.pathname)) {
      return null;
    }
    return url.pathname;
  } catch {
    return null;
  }
}

export function CheckInScanner({ locale }: { locale: "en" | "es" }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const camera = useRef<MediaStream | null>(null);
  const frame = useRef<number | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "unsupported" | "error">("idle");
  const [message, setMessage] = useState("");
  const es = locale === "es";

  function stop() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    camera.current?.getTracks().forEach((track) => track.stop());
    camera.current = null;
    if (video.current) video.current.srcObject = null;
  }

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    camera.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function start() {
    const Factory = (window as Window & { BarcodeDetector?: BarcodeFactory }).BarcodeDetector;
    if (!Factory || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setMessage(
        es
          ? "Tu navegador no admite el escáner integrado. Usa la cámara del móvil para abrir el QR oficial del local."
          : "Your browser does not support in-app scanning. Use your phone camera to open the venue's official QR code.",
      );
      return;
    }
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      camera.current = stream;
      const element = video.current;
      if (!element) {
        stop();
        return;
      }
      element.srcObject = stream;
      await element.play();
      const reader = new Factory({ formats: ["qr_code"] });
      setStatus("scanning");
      setMessage(es ? "Apunta al QR oficial del local." : "Point the camera at the venue's official QR.");
      let busy = false;
      const scan = async () => {
        if (busy || !camera.current || !video.current) return;
        busy = true;
        try {
          const detected = await reader.detect(video.current);
          const target = detected.map((item) => verifiedVenuePath(item.rawValue, location.origin, locale)).find(Boolean);
          if (target) {
            stop();
            router.push(target);
            return;
          }
        } catch {
          // Unsupported frames are ignored; server still validates any opened token.
        } finally {
          busy = false;
        }
        if (camera.current) frame.current = requestAnimationFrame(scan);
      };
      frame.current = requestAnimationFrame(scan);
    } catch {
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
    <section className="pasa-checkin-scanner" aria-label={es ? "Escáner de check-in" : "Check-in scanner"}>
      <div className="pasa-checkin-scanner__frame">
        <video ref={video} playsInline muted autoPlay aria-label={es ? "Vista previa de cámara" : "Camera preview"} />
      </div>
      <div className="pasa-checkin-scanner__actions">
        {status === "scanning" ? (
          <button type="button" className="button secondary" onClick={() => { stop(); setStatus("idle"); setMessage(""); }}>
            {es ? "Detener escáner" : "Stop scanner"}
          </button>
        ) : (
          <button type="button" className="button" onClick={start}>
            {es ? "Escanear QR del local" : "Scan venue QR"}
          </button>
        )}
        <p role="status" aria-live="polite">{message}</p>
      </div>
    </section>
  );
}
