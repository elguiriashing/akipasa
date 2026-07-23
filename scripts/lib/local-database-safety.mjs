const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function requireLocalDatabaseUrl(value) {
  if (!value) {
    throw new Error(
      "AKIPASA_LOCAL_DATABASE_URL is required (for example, postgresql://postgres:postgres@127.0.0.1:54322/postgres).",
    );
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "AKIPASA_LOCAL_DATABASE_URL must be a valid PostgreSQL URL.",
    );
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Only postgres:// or postgresql:// URLs are accepted.");
  }
  if (!localHosts.has(url.hostname)) {
    throw new Error(
      `Refusing database operation on non-local host "${url.hostname}".`,
    );
  }
  if (!url.pathname || url.pathname === "/") {
    throw new Error("The local PostgreSQL URL must include a database name.");
  }

  return url;
}
