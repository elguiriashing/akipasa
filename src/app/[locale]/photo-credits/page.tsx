import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { majorCities } from "@/lib/city-discovery";

export default async function PhotoCredits({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  return (
    <main className="shell">
      <h1>{es ? "Créditos de las fotografías" : "Photo credits"}</h1>
      <p>
        {es
          ? "Fotografías de Wikimedia Commons, reducidas y convertidas a WebP. El encuadre se adapta a cada pantalla. Cada imagen conserva su licencia original."
          : "Photographs from Wikimedia Commons, resized and converted to WebP. The crop adapts to each screen. Each image retains its original license."}
      </p>
      <div className="grid">
        {majorCities.map((city) => (
          <article key={city.key} className="panel">
            <h2>{city[locale]}</h2>
            <p>
              <a href={city.photo.source}>{city.photo.title}</a>
            </p>
            <p>{city.photo.credit}</p>
            <a href={city.photo.licenseUrl}>{city.photo.license}</a>
          </article>
        ))}
      </div>
    </main>
  );
}
