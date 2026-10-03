import Link from "next/link";
import {
  LEGAL_DOCUMENT_VERSION,
  LEGAL_REVIEW_APPROVED,
  legalDocuments,
  legalDocumentPath,
  type LegalLocale,
} from "@/lib/legal-documents";
import styles from "./LegalDocument.module.css";

export function LegalNavigation({ locale }: { locale: LegalLocale }) {
  return (
    <nav className={styles.navigation} aria-label={locale === "es" ? "Documentación legal" : "Legal documents"}>
      {Object.entries(legalDocuments).map(([key, translations]) => (
        <Link key={key} href={legalDocumentPath(locale, key)}>{translations[locale].title}</Link>
      ))}
    </nav>
  );
}

export default function LegalDocument({ locale, documentKey }: { locale: LegalLocale; documentKey: string }) {
  const doc = legalDocuments[documentKey]?.[locale];
  if (!doc) throw new Error("Unknown legal document");
  const es = locale === "es";
  return (
    <main className={`shell legal ${styles.document}`}>
      <header className="hero">
        <div className="eyebrow">AkiPasa · {es ? "Información legal" : "Legal information"}</div>
        <h1>{doc.title}</h1>
        <p>{es ? "Versión documental" : "Document version"}: {LEGAL_DOCUMENT_VERSION}</p>
      </header>
      {!LEGAL_REVIEW_APPROVED && (
        <aside className={styles.review} role="note">
          <strong>{es ? "Borrador para revisión — no aprobado para publicación definitiva" : "Review draft — not approved for final publication"}</strong>
          <p>{es
            ? "Este texto no acredita una revisión jurídica favorable ni el cumplimiento operativo. Deben resolverse los requisitos del expediente de revisión antes de adoptarlo. No sustituye contratos ya aceptados."
            : "This text does not establish legal approval or operational compliance. The release requirements in the review record must be resolved before adoption. It does not replace contracts already accepted."}</p>
        </aside>
      )}
      <LegalNavigation locale={locale} />
      <nav className={styles.contents} aria-label={es ? "En esta página" : "On this page"}>
        {doc.sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.heading}</a>)}
      </nav>
      <article className="panel prose">
        {doc.sections.map((section) => (
          <section className={styles.section} key={section.id} id={section.id} aria-labelledby={`heading-${section.id}`}>
            <h2 id={`heading-${section.id}`}>{section.heading}</h2>
            {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </section>
        ))}
      </article>
      <footer className={styles.contacts}>
        <a href="mailto:support@akipasa.com">support@akipasa.com</a>
        <a href="mailto:privacy@akipasa.com">privacy@akipasa.com</a>
        <a href="mailto:legal@akipasa.com">legal@akipasa.com</a>
        <Link href={`/${es ? "en" : "es"}${documentKey === "terms" || documentKey === "privacy" ? `/${documentKey}` : `/legal/${documentKey}`}`} lang={es ? "en" : "es"}>
          {es ? "English version" : "Versión en español"}
        </Link>
      </footer>
    </main>
  );
}
