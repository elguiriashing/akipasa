import type { BrowserContext } from "@playwright/test";
import { createServer, request as httpRequest } from "node:http";

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const productionRefs = new Set(["akipasa", "vhpbvcfkcteswlsdjrfl"]);
const businessPath = /^\/(en|es)\/business(?:\/|$)/;

/** Native requests never follow redirects. Raw compressed bytes are preserved. */
async function responseFrom(
  url: URL,
  headers: Record<string, string | string[] | undefined>,
  method: string,
  body: Buffer | null,
) {
  return new Promise<{
    status: number;
    headers: Record<string, string | string[]>;
    body: Buffer;
  }>((resolve, reject) => {
    const outgoing = httpRequest(url, { method, headers }, (incoming) => {
      const chunks: Buffer[] = [];
      incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
      incoming.on("error", reject);
      incoming.on("end", () => {
        const result: Record<string, string | string[]> = {};
        for (const [name, value] of Object.entries(incoming.headers))
          if (
            value !== undefined &&
            !["connection", "transfer-encoding"].includes(name)
          )
            result[name] = value;
        resolve({
          status: incoming.statusCode || 500,
          headers: result,
          body: Buffer.concat(chunks),
        });
      });
    });
    outgoing.on("error", reject);
    outgoing.setTimeout(30_000, () =>
      outgoing.destroy(new Error("Local QA transport timed out")),
    );
    outgoing.end(body);
  });
}

export function authenticatedLocalOrigins(baseURL: string, projectRef: string) {
  const local = new URL(baseURL);
  if (
    local.protocol !== "http:" ||
    !loopbackHosts.has(local.hostname) ||
    !local.port ||
    local.username ||
    local.password ||
    local.pathname !== "/" ||
    local.search ||
    local.hash
  )
    throw new Error(
      "Authenticated browser transport requires an explicit loopback HTTP origin.",
    );
  if (
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(projectRef) ||
    productionRefs.has(projectRef)
  )
    throw new Error(
      "Authenticated browser transport requires a non-production QA project reference.",
    );
  return { local: local.origin, qa: `https://${projectRef}.supabase.co` };
}

export function localAuthenticatedRedirect(
  location: string,
  requestURL: string,
  localOrigin: string,
  backendOrigin = localOrigin,
) {
  const target = new URL(location, requestURL);
  if (target.username || target.password)
    throw new Error("Credentialed redirect rejected.");
  if (
    ![
      localOrigin,
      backendOrigin,
      "https://business.akipasa.com",
      "https://akipasa.com",
    ].includes(target.origin)
  )
    throw new Error("Unexpected external redirect rejected.");
  const local = new URL(localOrigin);
  local.pathname = target.pathname;
  local.search = target.search;
  local.hash = target.hash;
  return local.href;
}

/** Fixed-backend loopback proxy; not a general URL forwarding endpoint. */
export async function installAuthenticatedLocalTransport(
  context: BrowserContext,
  options: { baseURL: string; projectRef: string; supabaseURL: string },
) {
  const origins = authenticatedLocalOrigins(
    options.baseURL,
    options.projectRef,
  );
  if (options.supabaseURL !== origins.qa)
    throw new Error(
      "QA Supabase URL must match the isolated project origin exactly.",
    );
  const blocked: string[] = [];
  let browserOrigin = "";
  const server = createServer(async (incoming, outgoing) => {
    try {
      if (
        !browserOrigin ||
        incoming.headers.host !== new URL(browserOrigin).host ||
        !incoming.url?.startsWith("/") ||
        incoming.url.startsWith("//")
      )
        throw new Error("Invalid proxy target");
      const destination = new URL(incoming.url, origins.local);
      if (destination.origin !== origins.local)
        throw new Error("Invalid proxy target");
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      const headers = { ...incoming.headers };
      // Only the fixed LOCAL socket receives a canonical business Host.
      // Middleware still derives its own product identity and authorization.
      if (businessPath.test(destination.pathname))
        headers.host = "business.akipasa.com";
      const result = await responseFrom(
        destination,
        headers,
        incoming.method || "GET",
        Buffer.concat(chunks),
      );
      if (typeof result.headers.location === "string")
        result.headers.location = localAuthenticatedRedirect(
          result.headers.location,
          new URL(incoming.url, browserOrigin).href,
          browserOrigin,
          origins.local,
        );
      outgoing.writeHead(result.status, result.headers);
      outgoing.end(result.body);
    } catch {
      blocked.push("local transport or redirect failed");
      outgoing.writeHead(502, { "Content-Type": "text/plain" });
      outgoing.end("Isolated QA transport rejected this response.");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing local QA proxy listener");
  browserOrigin = `http://127.0.0.1:${address.port}`;
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.username && !url.password && url.origin === browserOrigin) {
      await route.continue();
      return;
    }
    blocked.push("unallowlisted browser origin");
    await route.abort("blockedbyclient");
  });
  await context.routeWebSocket("**", (socket) => {
    blocked.push("unexpected browser WebSocket");
    socket.close();
  });
  return {
    origin: browserOrigin,
    assertSafe() {
      if (blocked.length)
        throw new Error(
          `Authenticated local transport blocked ${blocked.length} unsafe or failed request(s): ${[...new Set(blocked)].join(", ")}.`,
        );
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
