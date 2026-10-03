import { previewAccess, privateHeaders, readState } from "@/lib/pals/server";
import { statePortrait } from "@/lib/pals/art";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const access = await previewAccess();
    if (!access.user || !access.allowed)
      return new Response(null, { status: 404, headers: privateHeaders });
    const saved = await readState(access.user.id);
    if (!saved?.state.family || !saved.state.mapEnabled)
      return new Response(null, { status: 404, headers: privateHeaders });
    return new Response(statePortrait(saved.state, "map-companion"), {
      headers: {
        ...privateHeaders,
        "Content-Type": "image/svg+xml",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response(null, { status: 503, headers: privateHeaders });
  }
}
