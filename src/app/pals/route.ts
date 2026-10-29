import { identityPreviewHtml } from "@/components/pals/identity-preview";
import { previewAccess, privateHeaders } from "@/lib/pals/server";

// Restricted preview release checkpoint: intentionally unlinked and non-indexable.
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("lang");
  const locale = requested === "es" ? "es" : "en";
  try {
    const access = await previewAccess();
    if (!access.user)
      return new Response(
        `<!doctype html><html lang="${locale}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${locale === "es" ? "Prueba privada" : "Private preview"}</title></head><body style="font:16px system-ui;background:#14213d;color:#fff1db;padding:48px;line-height:1.6"><main style="max-width:520px;margin:12vh auto"><h1>${locale === "es" ? "Prueba privada" : "Private preview"}</h1><p>${locale === "es" ? "Esta zona aún no está abierta al público." : "This area is not open to the public."}</p><a style="color:#ffba87" href="/${locale}/auth?next=${encodeURIComponent(`/pals?lang=${locale}`)}" rel="nofollow">${locale === "es" ? "Inicia sesión con tu cuenta de equipo" : "Sign in with your team account"}</a></main></body></html>`,
        {
          status: 401,
          headers: {
            ...privateHeaders,
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "DENY",
          },
        },
      );
    if (!access.allowed)
      return new Response("Not found", {
        status: 404,
        headers: privateHeaders,
      });
    const nonce = crypto.randomUUID().replace(/-/g, "");
    return new Response(identityPreviewHtml(nonce, locale), {
      headers: {
        ...privateHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "DENY",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; style-src-attr 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'`,
      },
    });
  } catch {
    return new Response(
      locale === "es"
        ? "La prueba privada no está disponible temporalmente. Vuelve a intentarlo."
        : "The private preview is temporarily unavailable. Please retry.",
      { status: 503, headers: privateHeaders },
    );
  }
}
