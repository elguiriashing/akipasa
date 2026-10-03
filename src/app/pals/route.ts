import { previewHtml } from "@/components/pals/preview";
import { previewAccess, privateHeaders } from "@/lib/pals/server";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const access = await previewAccess();
    if (!access.user)
      return new Response(
        '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Private preview</title></head><body style="font:16px system-ui;background:#14213d;color:#fff1db;padding:48px;line-height:1.6"><main style="max-width:520px;margin:12vh auto"><h1>Private preview</h1><p>This area is not open to the public.</p><a style="color:#ffba87" href="/en/auth?next=%2Fpals" rel="nofollow">Sign in with your team account</a></main></body></html>',
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
    return new Response(previewHtml(nonce), {
      headers: {
        ...privateHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "DENY",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; style-src-attr 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'`,
      },
    });
  } catch {
    return new Response(
      "The private preview is temporarily unavailable. Please retry.",
      { status: 503, headers: privateHeaders },
    );
  }
}
