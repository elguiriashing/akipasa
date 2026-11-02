import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  return (
    <main className="shell legal pasa-legal-page">
      <section className="hero pasa-legal-hero">
        <div className="eyebrow">{es ? "Condiciones" : "Terms"}</div>
        <h1>
          {es ? "Uso responsable de AkiPasa" : "Using AkiPasa responsibly"}
        </h1>
      </section>
      <section className="panel prose pasa-legal-prose">
        <h2>{es ? "Contenido" : "Content"}</h2>
        <p>
          {es
            ? "Los negocios y usuarios deben publicar información verdadera, autorizada y legal. AkiPasa puede moderar, ocultar o retirar contenido engañoso, inseguro o infractor."
            : "Businesses and users must publish truthful, authorised and lawful information. AkiPasa may moderate, hide or remove misleading, unsafe or infringing content."}
        </p>
        <h2>{es ? "Reservas y recompensas" : "Bookings and rewards"}</h2>
        <p>
          {es
            ? "Las reservas externas son responsabilidad del proveedor indicado. XP, sellos y pasaportes no son dinero, no se compran y no se transfieren."
            : "External bookings are the stated provider's responsibility. XP, stamps and passports are not money, cannot be purchased and are non-transferable."}
        </p>
        <h2>{es ? "Cuentas de negocio" : "Business accounts"}</h2>
        <p>
          {es
            ? "Podemos solicitar prueba de representación antes de verificar un local. Los accesos de equipo deben asignarse únicamente a personas autorizadas."
            : "We may request proof of authority before verifying a venue. Team access must only be assigned to authorised people."}
        </p>
        <h2 id="akipals-world">AkiPals World</h2>
        <p>
          {es
            ? "World necesita una ubicación actual del dispositivo para situar tu personaje y mostrar lugares cercanos. Debes permitir el acceso a la ubicación en tu navegador o dispositivo. Si lo deniegas, lo retiras o no hay una ubicación fiable, World se pausa hasta que vuelva a estar disponible. Puedes editar tu personaje en el Armario sin usar la ubicación."
            : "World needs your current device location to position your character and show nearby places. You must allow location access in your browser or device. If you deny or withdraw permission, or a reliable position is unavailable, World pauses until location is available again. You can edit your character in Wardrobe without using location."}
        </p>
        <p>
          {es
            ? "Aceptar estas condiciones no activa ni sustituye el permiso de ubicación del navegador. World solo utiliza la ubicación mientras está visible y deja de solicitarla al ocultarlo o salir. Abrir el mapa o desplazarte por él no verifica visitas ni concede recompensas de check-in. "
            : "Accepting these terms does not enable or replace your browser’s location permission. World uses location while it is visible and stops requesting it when hidden or left. Opening or moving around the map does not verify visits or award check-in rewards. "}
          <a href={`/${locale}/privacy#akipals-world`}>
            {es ? "Privacidad de la ubicación" : "Location privacy"}
          </a>
        </p>
        <h2>{es ? "Contacto" : "Contact"}</h2>
        <p>support@akipasa.com</p>
        <p>
          <small>
            {es
              ? "Versión preliminar, 23 de julio de 2026. Pendiente de revisión jurídica profesional."
              : "Preview version, 23 July 2026. Pending professional legal review."}
          </small>
        </p>
        <p>
          <small>
            {es
              ? "Información de ubicación de AkiPals World actualizada el 2 de noviembre de 2026."
              : "AkiPals World location information updated 2 November 2026."}
          </small>
        </p>
      </section>
    </main>
  );
}
import { publicPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = publicPageMetadata("/terms");
