export default function AdminLoading() {
  return (
    <section className="operations-overview" role="status" aria-live="polite">
      <p>Administration · Administración</p>
      <progress aria-label="Loading administration · Cargando administración" />
    </section>
  );
}
