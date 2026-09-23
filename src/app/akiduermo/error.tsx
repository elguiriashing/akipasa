"use client";
export default function StayError({ reset }: { reset: () => void }) {
  return (
    <main
      className="panel"
      style={{ maxWidth: 700, margin: "64px auto", padding: 32 }}
    >
      <h1>No se pudo cargar · Unable to load</h1>
      <p>Inténtalo de nuevo en unos momentos. Please try again shortly.</p>
      <button className="button" onClick={reset}>
        Reintentar · Retry
      </button>
      <a href="https://akiduermo.akipasa.com/">AkiDuermo</a>
    </main>
  );
}
