import { nearbyVenuePage } from "@/lib/unclaimed-venues";
import { normalizeWorldVenues, parseWorldCell } from "@/lib/pals/world";
import { previewAccess, privateHeaders } from "@/lib/pals/server";

export const dynamic = "force-dynamic";

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: privateHeaders });
}

export async function GET(request: Request) {
  try {
    const access = await previewAccess();
    if (!access.user) return reply({ error: "Sign in required." }, 401);
    if (!access.allowed) return reply({ error: "Not found." }, 404);
    const cell = parseWorldCell(request.url);
    if (!cell) return reply({ error: "Invalid coarse map cell." }, 400);

    // Reuse the live discovery RPC, including its visibility constraints.
    // Do not create any geolocation, check-in, XP, social, or scan records.
    const page = await nearbyVenuePage({
      center: cell,
      radiusKm: 8,
      page: 1,
    });
    return reply({
      venues: normalizeWorldVenues(page.rows),
      truncated: page.total > page.rows.length,
    });
  } catch {
    return reply({ error: "Venue discovery is temporarily unavailable." }, 503);
  }
}
