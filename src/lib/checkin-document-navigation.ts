// Permissions-Policy belongs to a document, not to a client-router URL.
// Crossing the scanner boundary must fetch a new document in either direction.
export function crossesCheckinDocumentBoundary(from: string, to: string) {
  const source = new URL(from);
  const target = new URL(to, source);
  if (source.origin !== target.origin) return false;
  const scanner = (pathname: string) =>
    /^\/(en|es)\/check-in\/?$/.test(pathname);
  return scanner(source.pathname) !== scanner(target.pathname);
}
