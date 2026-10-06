export default {
  en: {
    title: "Cookies and privacy choices",
    sections: [
      { id: "scope", heading: "1. Storage and similar technology", paragraphs: [
        "This policy covers cookies, local storage, identifiers and similar access to information on a device, not just files labelled cookies. The operator is identified in the Legal notice. The Privacy policy explains personal-data processing, rights and international transfers.",
        "Strictly necessary storage is limited to what is required for transmitting communications or providing a service expressly requested by you. First-party status, an analytics purpose or calling an identifier anonymous does not automatically make it necessary."
      ]},
      { id: "choices", heading: "2. Your choices", paragraphs: [
        "Before optional storage or tracking starts, the consent interface must offer Accept all, Reject optional and a way to configure purposes, without preselected optional choices or unequal prominence that steers the choice. Necessary storage is not bundled with optional consent.",
        "Use Privacy choices to change your selection or withdraw consent. Refusal must not prevent access to services that do not require the optional technology. Withdrawal stops future processing based on that consent; stored data must also be assessed for deletion or anonymisation. Your browser can remove cookies and local storage, but deleting an identifier is not the same as exercising erasure rights over server records."
      ]},
      { id: "verified", heading: "3. Identifiers verified in the reviewed source", paragraphs: [
        "ak_personalisation: a first-party consent preference read by the behavioural tracking client. A value of granted enables that client. The complete writer, cookie scope and configured lifetime were not available for verification in this review; these must be added to the final inventory.",
        "akipasa:behaviour-queue:v1: first-party local storage used to queue optional behavioural events. The reviewed client limits the queue to 100 events, normally flushes after ten queued events or approximately one second, and sends batches of up to 25. Entries are removed on successful dispatch or when the client handles consent withdrawal. Offline failures can retain queued entries; no time-to-live was found in the reviewed client. It is not an essential authentication store.",
        "This is a verified partial inventory, not a declaration that these are the only storage mechanisms on the deployed site. Its incomplete status must be resolved before this policy is released as final."
      ]},
      { id: "inventory", heading: "4. Inventory to complete against production", paragraphs: [
        "For every active identifier or SDK, the final inventory must state its actual name or identifiable pattern, provider and controller/processor role, host/domain, purpose, category, type of storage, session or persistent lifetime, and any relevant third-country access.",
        "The scan must cover authentication and security, consent preferences, language and appearance settings, local map and filter caches, behavioural identifiers, Google Analytics or advertising tags if active, payment components, embedded maps/media, motion preferences, service workers and all company-operated subdomains. Candidate names or SDK defaults must not be presented as measurements of the live configuration."
      ]},
      { id: "devices", heading: "5. Location and motion permissions", paragraphs: [
        "Location and optional motion effects have distinct purposes. An Accept all choice can record a clearly described optional preference, but it does not replace any separate browser or operating-system permission. Motion access must not be repurposed for advertising, fingerprinting or tracking location under the label of a visual effect.",
        "Disable optional motion through the offered controls or device settings. A static alternative must remain available where motion is not essential to the service."
      ]},
      { id: "changes", heading: "6. Consent records and policy updates", paragraphs: [
        "The company must retain proportionate evidence of the purpose choices, notice version and time of consent or withdrawal, not unnecessary browsing data. A material change of purpose or provider must be reflected before processing and requires renewed consent where applicable. Consent must not be treated as perpetual merely because a preference cookie remains present.",
        "Questions or complaints: privacy@akipasa.com, with support@akipasa.com as an alternative contact."
      ]}
    ]
  },
  es: {
    title: "Cookies y opciones de privacidad",
    sections: [
      { id: "scope", heading: "1. Almacenamiento y tecnologías similares", paragraphs: [
        "Esta política comprende cookies, almacenamiento local, identificadores y accesos similares a información del dispositivo, no solo archivos denominados cookies. El titular se identifica en el Aviso legal. La Política de privacidad explica tratamientos, derechos y transferencias internacionales.",
        "El almacenamiento estrictamente necesario se limita a lo requerido para transmitir comunicaciones o prestar un servicio expresamente solicitado. El carácter propio, la finalidad analítica o denominar anónimo a un identificador no lo convierte automáticamente en necesario."
      ]},
      { id: "choices", heading: "2. Sus opciones", paragraphs: [
        "Antes de iniciar almacenamiento o seguimiento opcionales, la interfaz deberá ofrecer Aceptar todas, Rechazar opcionales y configuración por finalidades, sin opciones opcionales premarcadas ni diferencias de visibilidad que orienten la decisión. El almacenamiento necesario no se agrupa como consentimiento opcional.",
        "Utilice Opciones de privacidad para modificar su selección o retirar el consentimiento. El rechazo no impedirá acceder a servicios que no requieran la tecnología opcional. La retirada detiene futuros tratamientos basados en ese consentimiento; también deberá evaluarse la supresión o anonimización de datos almacenados. Puede borrar cookies y almacenamiento local desde el navegador, pero eliminar un identificador no equivale a ejercer la supresión de registros del servidor."
      ]},
      { id: "verified", heading: "3. Identificadores comprobados en el código revisado", paragraphs: [
        "ak_personalisation: preferencia de consentimiento propia que consulta el cliente de seguimiento conductual. El valor granted habilita ese cliente. No pudo verificarse durante esta revisión el código completo que la escribe, su ámbito ni duración configurada; deben incorporarse al inventario definitivo.",
        "akipasa:behaviour-queue:v1: almacenamiento local propio que mantiene una cola de eventos conductuales opcionales. El cliente revisado limita la cola a 100 eventos, normalmente realiza el envío al alcanzar diez eventos o aproximadamente un segundo y envía lotes de hasta 25. Las entradas se eliminan tras un envío correcto o cuando el cliente gestiona la retirada del consentimiento. Los fallos sin conexión pueden mantener entradas; no se encontró caducidad temporal en el cliente revisado. No es almacenamiento esencial de autenticación.",
        "Se trata de un inventario parcial verificado, no de una declaración de que sean los únicos mecanismos del despliegue. Debe resolverse su carácter incompleto antes de publicar esta política como definitiva."
      ]},
      { id: "inventory", heading: "4. Inventario que debe completarse en producción", paragraphs: [
        "El inventario definitivo deberá indicar, para cada identificador o SDK activo, su nombre o patrón identificable real, proveedor y papel de responsable o encargado, host/dominio, finalidad, categoría, tipo de almacenamiento, duración de sesión o persistente y accesos pertinentes desde terceros países.",
        "La comprobación debe abarcar autenticación y seguridad, preferencias de consentimiento, idioma y apariencia, cachés locales de mapas y filtros, identificadores conductuales, etiquetas de Google Analytics o publicidad si están activas, componentes de pago, mapas y medios integrados, preferencias de movimiento, trabajadores de servicio y subdominios operados por la sociedad. Los nombres posibles o valores predeterminados de un SDK no deben presentarse como mediciones del despliegue."
      ]},
      { id: "devices", heading: "5. Permisos de ubicación y movimiento", paragraphs: [
        "La ubicación y los efectos opcionales de movimiento tienen finalidades distintas. Aceptar todas puede registrar una preferencia opcional claramente descrita, pero no sustituye los permisos independientes exigidos por el navegador o sistema operativo. El acceso al movimiento no debe reutilizarse para publicidad, huellas del dispositivo o seguimiento de ubicación bajo la denominación de efecto visual.",
        "Puede desactivar el movimiento opcional mediante los controles disponibles o ajustes del dispositivo. Debe mantenerse una alternativa estática cuando el movimiento no sea esencial para el servicio."
      ]},
      { id: "changes", heading: "6. Registro de consentimiento y actualizaciones", paragraphs: [
        "La sociedad deberá conservar prueba proporcionada de las finalidades elegidas, versión informativa y fecha de consentimiento o retirada, no información de navegación innecesaria. Un cambio relevante de finalidad o proveedor deberá reflejarse antes del tratamiento y requerirá nuevo consentimiento cuando corresponda. La presencia de una cookie de preferencias no convierte el consentimiento en perpetuo.",
        "Consultas o reclamaciones: privacy@akipasa.com, con support@akipasa.com como contacto alternativo."
      ]}
    ]
  }
} as const;
