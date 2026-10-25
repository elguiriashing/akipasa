import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";

export default async function AccountDeletionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  return (
    <main className="page-shell stack">
      <h1>
        {es ? "Eliminar tu cuenta AkiSuite" : "Delete your AkiSuite account"}
      </h1>
      <p>AkiPasa · AkiBusiness · AkiHQ · AkiDuermo · AkiCoches</p>
      <p>
        {es
          ? "La identidad es compartida: eliminarla afecta al acceso a los cinco productos. No necesitas iniciar sesión para consultar estas instrucciones."
          : "Your identity is shared: deleting it affects access to all five products. These instructions are available without signing in."}
      </p>
      <ol>
        <li>
          <Link href={`/${locale}/account/privacy`}>
            {es
              ? "Con sesión iniciada, abre Privacidad de la cuenta y solicita la eliminación."
              : "When signed in, open Account privacy and request deletion."}
          </Link>
        </li>
        <li>
          {es
            ? "Si no puedes acceder, escribe desde tu correo de cuenta a "
            : "If you cannot sign in, write from your account email to "}
          <a href="mailto:support@akipasa.com?subject=AkiSuite%20account%20deletion">
            support@akipasa.com
          </a>
          {es
            ? ". Indica el producto y que deseas eliminar tu cuenta. No envíes contraseñas ni documentos sensibles por correo."
            : ". Name the product and request account deletion. Do not email passwords or sensitive documents."}
        </li>
      </ol>
      <p>
        {es
          ? "Una persona verifica la solicitud, elimina manualmente la cuenta y los datos eliminables en un plazo de 48 horas desde la verificación y después envía una confirmación escrita manualmente desde soporte. Si una retención legal u otro impedimento excepcional requiere más tiempo, te explicamos el motivo y los datos afectados."
          : "A person verifies the request, manually deletes the account and erasable data within 48 hours of verification, then sends a manually written support confirmation. If a legal hold or another exceptional blocker requires more time, we explain the reason and affected records."}
      </p>
      <p>
        {es
          ? "Se revisan la identidad, las sesiones, el perfil, los archivos personales y los proveedores. La continuidad de un negocio, las reservas y las suscripciones se resuelven por separado; la solicitud no cancela automáticamente un pago ni elimina datos de otras personas."
          : "Review covers identity, sessions, profile, personal files and providers. Business continuity, bookings and subscriptions are resolved separately; a request does not automatically cancel payments or delete other people's records."}
      </p>
      <p>
        {es
          ? "Los registros exigidos por ley o sujetos a una retención legal se restringen y se conservan solo con una justificación y un plazo documentados. Te explicaremos qué se elimina y qué debe conservarse. No se garantiza un plazo de 30 días para copias de seguridad sin confirmación del proveedor."
          : "Legally required records and legal holds are restricted and retained only with a documented reason and deadline. We explain what is erased and what must be retained. A 30-day backup-erasure period is not guaranteed without provider confirmation."}
      </p>
      <p>
        {es
          ? "Calendario de conservación: registros operativos de este proceso, 90 días; evidencia mínima gestionada de soporte y eliminación, 12 meses desde el cierre; documentación comercial y contable española que deba conservarse, 6 años desde el último asiento aplicable, con acceso restringido y posibles obligaciones o retenciones específicas más largas. Estos plazos no autorizan conservar todos los datos personales. Los correos externos y las copias de seguridad requieren revisión del proveedor."
          : "Retention schedule: this workflow's operational logs, 90 days; minimal managed support/deletion evidence, 12 months after closure; Spanish commercial/accounting records that must be retained, 6 years from the applicable last entry, with restricted access and any longer specific statutory obligation or legal hold. These periods do not authorize keeping all personal data. External mail and backup retention require provider review."}
      </p>
      <p>
        <Link href={`/${locale}/privacy`}>
          {es ? "Política de privacidad" : "Privacy policy"}
        </Link>
      </p>
    </main>
  );
}
