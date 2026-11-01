import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";

export default async function PrivacyPage({
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
        <div className="eyebrow">{es ? "Privacidad" : "Privacy"}</div>
        <h1>
          {es
            ? "Tu información, bajo control"
            : "Your information, under control"}
        </h1>
        <p className="lede">
          {es
            ? "Resumen de privacidad de AkiPasa para la versión preliminar pública."
            : "AkiPasa privacy summary for the public preview."}
        </p>
      </section>
      <section className="panel prose pasa-legal-prose">
        <h2>{es ? "Qué guardamos" : "What we store"}</h2>
        <p>
          {es
            ? "Datos de cuenta, favoritos, locales seguidos, actividad de recompensas y contenido que envías. La ubicación precisa del dispositivo no se guarda por defecto."
            : "Account data, favorites, followed venues, reward activity and content you submit. Precise device location is not stored by default."}
        </p>
        <h2>{es ? "Para qué" : "Why"}</h2>
        <p>
          {es
            ? "Para prestar el servicio, protegerlo contra abusos y ofrecer estadísticas agregadas a los negocios. No vendemos datos personales."
            : "To provide the service, protect it from abuse and give businesses aggregate statistics. We do not sell personal data."}
        </p>
        <h2 id="city-stories">
          {es ? "Fotos e historias de ciudades" : "Photos and city stories"}
        </h2>
        <p>
          {es
            ? "Estas funciones pueden no estar disponibles durante el despliegue. Cuando se activen, se aplicarán las siguientes reglas."
            : "These features may be unavailable during rollout. When enabled, the following rules apply."}
        </p>
        <p>
          {es
            ? "Compartir una foto es opcional y requiere marcar expresamente su publicación en la ciudad del local. Una visita debe haber sido verificada antes de compartir: la foto, la etiqueta de selfie y abrir una página no acreditan asistencia ni conceden XP. Las fotos esperan revisión manual; no enviamos estas imágenes a un servicio de IA para verificar asistencia."
            : "Sharing a photo is optional and requires an explicit choice to publish it in the venue’s city. A visit must already be verified before sharing: a photo, its selfie label and opening a page do not prove attendance or award XP. Photos await manual review; we do not send these images to an AI service to verify attendance."}
        </p>
        <p>
          {es
            ? "La foto se vuelve a codificar antes de enviarla y el servidor rechaza los metadatos de imagen no permitidos. La historia muestra el local y su ciudad, no tus coordenadas precisas ni campos privados del perfil. La ubicación para ordenar ciudades cercanas se calcula en tu dispositivo cuando eliges usarla. Los recuentos indican fotos aprobadas recientes, no personas presentes ni aforo."
            : "The photo is re-encoded before upload and the server rejects disallowed image metadata. A story shows the venue and its city, not your precise coordinates or private profile fields. Location used to order nearby cities is calculated on your device when you choose to use it. Counts mean recent approved photos, not people currently present or venue occupancy."}
        </p>
        <p>
          {es
            ? "El acceso público caduca como máximo 24 horas después del envío. Caducar el acceso no confirma el borrado físico del archivo. Puedes retirar tus historias desde Comunidad aunque ya no puedas publicar. La retirada revoca el acceso en AkiPasa e intenta borrar el archivo; si queda limpieza pendiente, se indica expresamente. La exportación de la cuenta incluye los registros propios conservados y la eliminación de la cuenta retira los registros vinculados, sin prometer el borrado de copias de seguridad o de copias ya descargadas por otras personas."
            : "Public access expires no later than 24 hours after submission. Access expiry does not confirm physical file deletion. You can remove your stories from Community even if you can no longer publish. Removal revokes access through AkiPasa and attempts file deletion; outstanding cleanup is explicitly indicated. Account exports include your retained records, and account deletion removes linked records without promising erasure of backups or copies other people already downloaded."}
        </p>
        <h2>{es ? "Tus derechos" : "Your rights"}</h2>
        <p>
          {es
            ? "Puedes descargar tus datos y solicitar la eliminación desde Cuenta. Las solicitudes se registran y se procesan de forma verificable."
            : "You can download your data and request deletion from Account. Requests are logged and processed verifiably."}
        </p>
        <h2 id="account-deletion">
          {es
            ? "Solicitar la eliminación de tu cuenta"
            : "Request account deletion"}
        </h2>
        <p>
          {es
            ? "AkiPasa Marketing S.L. gestiona la cuenta compartida de AkiPasa, AkiDuermo, AkiCoches, AkiHQ y AkiBusiness. Eliminar esa cuenta afecta al acceso a todos estos productos."
            : "AkiPasa Marketing S.L. manages the shared account used by AkiPasa, AkiDuermo, AkiCoches, AkiHQ and AkiBusiness. Deleting that account affects access to all these products."}
        </p>
        <p>
          <a
            className="underline underline-offset-4"
            href={`/${locale}/account/privacy`}
          >
            {es
              ? "Abrir las opciones de privacidad de tu cuenta"
              : "Open your account privacy options"}
          </a>
          {es
            ? " para descargar tus datos o registrar una solicitud de eliminación si puedes iniciar sesión."
            : " to download your data or record a deletion request if you can sign in."}
        </p>
        <p>
          {es
            ? "Si no puedes iniciar sesión, escribe desde el correo de tu cuenta a "
            : "If you cannot sign in, email us from your account email address at "}
          <a
            className="underline underline-offset-4"
            href="mailto:support@akipasa.com"
          >
            support@akipasa.com
          </a>
          {es
            ? " indicando que solicitas eliminar la cuenta compartida. No envíes contraseñas, códigos de acceso ni documentos de identidad en ese primer mensaje."
            : " and say that you want to delete your shared account. Do not include passwords, sign-in codes or identity documents in that first message."}
        </p>
        <p>
          {es
            ? "El equipo verifica la solicitud antes de actuar. Nuestro objetivo es atender las solicitudes verificadas en 48 horas y confirmar personalmente el resultado. Registrar una solicitud no elimina la cuenta de inmediato."
            : "Our team verifies the request before acting. We aim to handle verified requests within 48 hours and personally confirm the outcome. Recording a request does not immediately delete the account."}
        </p>
        <p>
          {es
            ? "Te explicaremos qué datos se eliminan y cualquier información que debamos conservar por obligaciones contables, seguridad o reclamaciones, con acceso restringido. La eliminación de la cuenta no borra automáticamente registros de un negocio ni confirma la eliminación de copias de seguridad o de proveedores."
            : "We will explain which data is deleted and any information retained for accounting obligations, security or claims, with restricted access. Account deletion does not automatically erase business records or confirm deletion from backups or providers."}
        </p>
        <h2>{es ? "Contacto" : "Contact"}</h2>
        <p>privacy@akipasa.com</p>
        <p>
          <small>
            {es
              ? "Última actualización: 1 de noviembre de 2026. Pendiente de revisión jurídica profesional antes del lanzamiento comercial."
              : "Last updated: 1 November 2026. Pending professional legal review before commercial launch."}
          </small>
        </p>
      </section>
    </main>
  );
}
import { publicPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = publicPageMetadata("/privacy");
