import Link from "next/link";
import {
  RESULT_PAGE_SIZE,
  resultPageHref,
  type ResultQuery,
} from "../lib/result-pagination";

export function ResultPagination({
  locale,
  path,
  query,
  pageKey,
  anchor,
  page,
  total,
}: {
  locale: string;
  path: string;
  query: ResultQuery;
  pageKey: string;
  anchor: string;
  page: number;
  total: number;
}) {
  if (total <= RESULT_PAGE_SIZE) return null;
  const pages = Math.ceil(total / RESULT_PAGE_SIZE);
  return (
    <nav
      className="section-head"
      style={{ flexWrap: "wrap", gap: 12 }}
      aria-label={locale === "es" ? "Páginas de resultados" : "Result pages"}
    >
      {page > 1 ? (
        <Link
          prefetch={false}
          className="button button-ghost"
          href={resultPageHref(path, query, pageKey, page - 1, anchor)}
        >
          {locale === "es" ? "Anterior" : "Previous"}
        </Link>
      ) : (
        <span />
      )}
      <span role="status">
        {locale === "es" ? "Página" : "Page"} {page} / {pages} ·{" "}
        {(page - 1) * RESULT_PAGE_SIZE + 1}–
        {Math.min(page * RESULT_PAGE_SIZE, total)} / {total}
      </span>
      {page < pages ? (
        <Link
          prefetch={false}
          className="button button-ghost"
          href={resultPageHref(path, query, pageKey, page + 1, anchor)}
        >
          {locale === "es" ? "Siguiente" : "Next"}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
