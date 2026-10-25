import Link from "next/link";

export function SuitePrivacyNotice({ locale }: { locale: "en" | "es" }) {
  const es = locale === "es";
  const sections = es
    ? [
        [
          "Responsable y alcance",
          "AkiPasa Marketing S.L. opera la identidad compartida de AkiSuite: AkiPasa, AkiBusiness, AkiHQ, AkiDuermo y AkiCoches. Este aviso cubre las webs y su contenido en Android. Contacto: privacy@akipasa.com; soporte: support@akipasa.com. Los negocios que gestionan datos de clientes o empleados tienen también sus propias responsabilidades de información y tratamiento.",
        ],
        [
          "Datos y funciones",
          "Tratamos identificadores, nombre, correo y autenticación; teléfono, localidad, provincia, idioma, biografía y fotos si los aportas. El perfil y la identidad se comparten entre productos. Según las funciones que uses: favoritos, búsquedas/interacciones, preferencias y recompensas; fichas, eventos, alojamientos y vehículos; reservas, fechas, contacto y mensajes al proveedor. AkiHQ gestiona fichas/equipos/contenido. AkiBusiness puede tratar contactos CRM, comunicaciones de equipo y correo conectado, documentos, turnos, ventas, facturas y registros de caja. Estos datos salen del dispositivo para prestar la función.",
        ],
        [
          "Ubicación y archivos",
          "El permiso de ubicación se solicita para funciones que eliges. El área visible del mapa y consultas pueden enviarse al servidor o proveedor cartográfico; baja precisión no garantiza que nunca se transmita una zona precisa. Las direcciones de fichas y ubicaciones introducidas son datos separados. Las fotos y documentos seleccionados se suben para la función solicitada; no se escanea toda la biblioteca.",
        ],
        [
          "Finalidades y opciones",
          "Tratamos datos necesarios para prestar funciones solicitadas, cuentas/permisos, reservas, suscripciones, soporte, seguridad y prevención de abusos y obligaciones aplicables. Puedes no aportar campos/archivos opcionales y cambiar la visibilidad del perfil. La analítica opcional donde está configurada depende de tus preferencias de privacidad; puedes rechazarla o retirar el consentimiento sin cerrar la cuenta.",
        ],
        [
          "Proveedores y destinatarios",
          "Cloudflare proporciona infraestructura; Supabase, identidad/base de datos/almacenamiento; Google, inicio de sesión si lo eliges y GA4 cuando aceptas la analítica opcional en superficies configuradas. GA4 puede usar identificadores del navegador e interacciones, aunque Android no use Advertising ID. Stripe procesa facturación/pagos y conservamos las referencias e historial necesarios; no envíes tarjetas a soporte. Los servicios de correo e integraciones habilitadas procesan comunicaciones correspondientes. En asistencia con IA habilitada, el contenido que envías puede ser tratado por el proveedor configurado, incluido OpenAI. Evita información sensible innecesaria. Los equipos autorizados acceden a los registros de su negocio, los proveedores reciben solicitudes de reserva/contacto y el contenido que decides publicar se muestra según sus controles.",
        ],
        [
          "Seguridad y transferencias",
          "Los servicios configurados usan conexiones cifradas y controles de acceso. No vendemos datos personales. Los proveedores pueden operar fuera de tu país; solicita información sobre destinatarios y salvaguardas a privacy@akipasa.com.",
        ],
        [
          "Conservación",
          "Los datos activos se conservan mientras sean necesarios para la cuenta/función o hasta que proceda eliminarlos. El calendario aprobado limita registros operativos a 90 días y evidencia mínima gestionada de soporte/eliminación a 12 meses tras cerrar el caso. La documentación comercial/contable española necesaria se restringe 6 años desde el último asiento aplicable, salvo obligaciones específicas o retenciones legales más largas. No es un plazo general para todos los datos personales. Los eventos opcionales conservan sus periodos específicos publicados. Correo externo y copias requieren revisión de proveedores: no garantizamos borrar copias en 30 días sin su confirmación.",
        ],
        [
          "Derechos y eliminación",
          "Puedes solicitar acceso, exportación, rectificación, supresión, limitación u oposición y retirar consentimientos opcionales. La eliminación de la identidad afecta a los cinco productos. Una persona verifica la solicitud, borra manualmente cuenta/datos eliminables en 48 horas desde la verificación y después escribe personalmente la confirmación de soporte. Los impedimentos excepcionales se explican con motivo, datos afectados y siguiente paso. La continuidad del negocio y facturación se revisan separadamente; no se borran indiscriminadamente datos ajenos. Se explican los datos que deban conservarse. Contacta con privacidad o reclama ante tu autoridad de protección de datos competente.",
        ],
      ]
    : [
        [
          "Operator and scope",
          "AkiPasa Marketing S.L. operates AkiSuite's shared identity: AkiPasa, AkiBusiness, AkiHQ, AkiDuermo and AkiCoches. This notice covers the websites and their content inside Android. Contact: privacy@akipasa.com; support: support@akipasa.com. Businesses managing customer/employee records also have their own information and processing responsibilities.",
        ],
        [
          "Data and functions",
          "We process identifiers, name, email and authentication; phone, city, province, language, biography and photos if supplied. Profile and identity are shared across products. Depending on features used: saved items, searches/interactions, preferences and rewards; listings, events, accommodation and vehicles; bookings, dates, contact and provider messages. AkiHQ manages listings/teams/content. AkiBusiness can process CRM contacts, team communications and connected email, documents, rotas, sales, invoices and cash records. These data leave the device to provide the function.",
        ],
        [
          "Location and files",
          "Location permission is requested for features you choose. The viewed map area and queries can be sent to the server/map provider; low accuracy does not guarantee no precise area is transmitted. Listing addresses and entered locations are separate data. Selected photos/documents are uploaded for the requested feature; the whole library is not scanned.",
        ],
        [
          "Purposes and choices",
          "Necessary data supports requested functions, accounts/permissions, bookings, subscriptions, support, security/abuse prevention and applicable obligations. You can decline optional fields/files and change profile visibility. Optional analytics where configured depends on privacy preferences; you can decline or withdraw consent without closing the account.",
        ],
        [
          "Providers and recipients",
          "Cloudflare supplies infrastructure; Supabase supplies identity/database/storage; Google supplies sign-in if chosen and GA4 when you consent to optional analytics on configured surfaces. GA4 can use browser identifiers/interactions although Android does not use Advertising ID. Stripe processes billing/payments and we retain necessary references/history; do not send cards to support. Enabled email services/integrations process corresponding communications. With enabled AI assistance, submitted content can be processed by the configured provider, including OpenAI. Avoid unnecessary sensitive content. Authorized teams access their business records, booking providers receive requests/contact, and content you choose to publish appears according to its controls.",
        ],
        [
          "Security and transfers",
          "Configured services use encrypted connections and access controls. We do not sell personal data. Providers may operate outside your country; request recipient/safeguard information at privacy@akipasa.com.",
        ],
        [
          "Retention",
          "Active data is kept while needed for the account/function or until eligible deletion. The approved schedule limits operational logs to 90 days and minimal managed support/deletion evidence to 12 months after case closure. Necessary Spanish commercial/accounting documentation is restricted for 6 years from the applicable last entry, subject to longer specific obligations or legal holds. This is not a general period for all personal data. Optional events retain their specific published periods. External email/backups require provider review: we do not guarantee backup erasure within 30 days without confirmation.",
        ],
        [
          "Rights and deletion",
          "You may request access, export, correction, erasure, restriction or objection and withdraw optional consent. Identity deletion affects all five products. A person verifies the request, manually deletes the account/erasable data within 48 hours of verification, then personally writes the support confirmation. Exceptional blockers are explained with reason, affected records and next step. Business continuity/billing are reviewed separately; other people's records are not indiscriminately erased. Necessary retained data is explained. Contact privacy or complain to your competent data-protection authority.",
        ],
      ];
  return (
    <main className="shell legal">
      <section className="hero">
        <div className="eyebrow">AkiSuite</div>
        <h1>{es ? "Privacidad" : "Privacy"}</h1>
        <p>
          {es
            ? "Actualizado: 25 de octubre de 2026"
            : "Updated: 25 October 2026"}
        </p>
      </section>
      <section className="panel prose">
        {sections.map(([title, body]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </section>
        ))}
        <p>
          <Link href={`/${locale}/account-deletion`}>
            {es
              ? "Instrucciones públicas para eliminar la cuenta"
              : "Public account-deletion instructions"}
          </Link>
        </p>
        <p>
          <Link href={`/${locale}/account/privacy`}>
            {es
              ? "Exportar datos o solicitar eliminación con sesión iniciada"
              : "Export data or request deletion when signed in"}
          </Link>
        </p>
        <p>
          <a href="mailto:privacy@akipasa.com">privacy@akipasa.com</a>
        </p>
      </section>
    </main>
  );
}
