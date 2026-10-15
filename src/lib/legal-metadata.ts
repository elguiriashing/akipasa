import type { Metadata } from "next";
import { LEGAL_REVIEW_APPROVED, legalDocuments, legalDocumentPath, type LegalLocale } from "./legal-documents";

export function legalMetadata(locale: LegalLocale, key: string): Metadata {
  const path = legalDocumentPath(locale, key);
  return {
    title: `${legalDocuments[key][locale].title} | AkiPasa`,
    robots: { index: LEGAL_REVIEW_APPROVED, follow: true },
    alternates: {
      canonical: `https://akipasa.com${path}`,
      languages: {
        en: `https://akipasa.com${legalDocumentPath("en", key)}`,
        es: `https://akipasa.com${legalDocumentPath("es", key)}`,
      },
    },
  };
}
