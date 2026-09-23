import Link from "next/link";
export default function NotFound() {
  return (
    <main
      className="panel"
      style={{ maxWidth: 700, margin: "64px auto", padding: 32 }}
    >
      <h1>Alojamiento no disponible · Stay unavailable</h1>
      <p>Este alojamiento no está disponible en AkiDuermo.</p>
      <p>This property is not available on AkiDuermo.</p>
      <Link className="button" href="https://akiduermo.akipasa.com/">
        Explorar alojamientos · Explore stays
      </Link>
    </main>
  );
}
