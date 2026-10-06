/** Review package: do not mark approved or change currentTermsVersion without the release checks. */
export const LEGAL_DOCUMENT_VERSION = "2026-10-03-review.1";
export const LEGAL_REVIEW_APPROVED = false;
export type LegalLocale = "en" | "es";
export interface LegalSection { id: string; heading: string; paragraphs: readonly string[] }
export interface LegalDocumentContent { title: string; sections: readonly LegalSection[] }
import notice from "./legal-content/notice";
import terms from "./legal-content/terms";
import privacy from "./legal-content/privacy";
import cookies from "./legal-content/cookies";
import subscriptions from "./legal-content/subscriptions";
import business from "./legal-content/business";
import community from "./legal-content/community";
import data_processing from "./legal-content/data-processing";
import accessibility from "./legal-content/accessibility";

export const legalDocuments: Record<string, Record<LegalLocale, LegalDocumentContent>> = {
  "notice": notice,
  "terms": terms,
  "privacy": privacy,
  "cookies": cookies,
  "subscriptions": subscriptions,
  "business": business,
  "community": community,
  "data-processing": data_processing,
  "accessibility": accessibility,
};
export function isLegalDocumentKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(legalDocuments, key);
}
export function legalDocumentPath(locale: LegalLocale, key: string): string {
  return key === "terms" || key === "privacy" ? `/${locale}/${key}` : `/${locale}/legal/${key}`;
}
