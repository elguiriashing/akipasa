import Link from "next/link";

export function AdminReadFailure({
  locale,
  href,
}: {
  locale: "en" | "es";
  href: string;
}) {
  const es = locale === "es";
  return (
    <section className="panel stack" role="alert">
      <strong>
        {es
          ? "No se han podido consultar los datos"
          : "These records could not be loaded"}
      </strong>
      <p>
        {es
          ? "La lista no está disponible. Reintenta antes de tomar una decisión."
          : "The list is unavailable. Retry before making a decision."}
      </p>
      <Link className="button secondary" href={href}>
        {es ? "Reintentar" : "Retry"}
      </Link>
    </section>
  );
}

export function AdminMutationNotice({
  locale,
  query,
}: {
  locale: "en" | "es";
  query: Record<string, string | undefined>;
}) {
  if (!query.updated && !query.error) return null;
  const es = locale === "es";
  return (
    <p className="notice" role={query.error ? "alert" : "status"}>
      {query.error
        ? es
          ? "No se ha podido guardar el cambio. Revisa los datos y vuelve a intentarlo."
          : "The change could not be saved. Check the fields and try again."
        : es
          ? "Cambio guardado y auditado."
          : "Change saved and audited."}
    </p>
  );
}
