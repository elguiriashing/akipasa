export default {
  en: {
    title: "Accessibility information and assistance",
    sections: [
      { id: "scope", heading: "1. Scope and status", paragraphs: [
        "AkiPasa aims to make discovery, account management, legal information and purchasing usable by people with different access needs. This document provides an assistance route; it is not a claim of certified WCAG or statutory conformity.",
        "A complete accessibility assessment of the deployed website, mobile experiences, authentication, cookie controls, payment and business interfaces has not been verified in this review. Where the service is within Spain's accessibility legislation, the required service information and supporting assessment must be completed. Any microenterprise exemption must be assessed against the actual legal criteria; it is not presumed from being a startup."
      ]},
      { id: "alternatives", heading: "2. Accessible alternatives", paragraphs: [
        "Optional motion effects should have a static alternative and respect relevant reduced-motion preferences. Maps should not be the only way to obtain material venue information, and essential purchasing or cancellation actions should not depend solely on dragging, colour or motion.",
        "Where you encounter a barrier, request the relevant information or assistance through support@akipasa.com. The company must offer an appropriate alternative without requiring unnecessary health or disability information."
      ]},
      { id: "report", heading: "3. Reporting a barrier", paragraphs: [
        "Describe the page or task, the difficulty and, if useful, the browser, device or assistive technology involved. Tell us a suitable response format. We will assess the report and provide information about the available alternative and planned correction where known.",
        "Applicable rights to contact consumer, accessibility or other competent authorities remain unaffected. Third-party content or checkout does not automatically exempt AkiPasa from its own duties."
      ]}
    ]
  },
  es: {
    title: "Información de accesibilidad y asistencia",
    sections: [
      { id: "scope", heading: "1. Ámbito y estado", paragraphs: [
        "AkiPasa pretende que el descubrimiento, gestión de cuentas, información jurídica y contratación puedan utilizarse por personas con distintas necesidades. Este documento facilita asistencia; no constituye certificación de conformidad WCAG ni legal.",
        "En esta revisión no se ha verificado una evaluación completa del sitio desplegado, experiencias móviles, autenticación, cookies, pago e interfaces empresariales. Cuando el servicio esté comprendido en la legislación española de accesibilidad, deberán completarse la información y evaluación exigidas. Cualquier excepción de microempresa deberá comprobarse conforme a los criterios legales efectivos; no se presume por ser una empresa nueva."
      ]},
      { id: "alternatives", heading: "2. Alternativas accesibles", paragraphs: [
        "Los efectos opcionales de movimiento deberán tener alternativa estática y respetar las preferencias pertinentes de movimiento reducido. El mapa no debe ser la única vía para obtener información relevante, ni las acciones esenciales de contratación o cancelación depender únicamente de arrastre, color o movimiento.",
        "Si encuentra una barrera, solicite información o asistencia mediante support@akipasa.com. La sociedad deberá ofrecer una alternativa adecuada sin exigir datos innecesarios de salud o discapacidad."
      ]},
      { id: "report", heading: "3. Comunicación de barreras", paragraphs: [
        "Indique página o tarea, dificultad y, si resulta útil, navegador, dispositivo o tecnología de apoyo. Señale el formato adecuado para responder. Se evaluará la comunicación y se informará de la alternativa disponible y corrección prevista cuando se conozca.",
        "Se mantienen los derechos aplicables ante autoridades de consumo, accesibilidad u otras competentes. Que un contenido o pago pertenezca a terceros no exime automáticamente a AkiPasa de sus propias obligaciones."
      ]}
    ]
  }
} as const;
