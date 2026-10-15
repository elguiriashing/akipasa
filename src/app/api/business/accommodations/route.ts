import { accommodationApiTerms } from "@/lib/accommodation-api-terms";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  accommodationOperation,
  accommodationPropertyId,
} from "@/lib/independent-accommodation";
import { readBoundedText, RequestSecurityError } from "@/lib/request-security";

const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(request: Request) {
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return reply({ error: "sign_in" }, 401);
  const terms = await accommodationApiTerms(db, user.id);
  if (terms)
    return reply({ error: terms }, terms === "unavailable" ? 503 : 403);
  const raw = new URL(request.url).searchParams.get("property");
  if (!raw) {
    const { data, error } = await db.rpc("managed_accommodation_properties");
    return error
      ? reply({ error: "unavailable" }, 503)
      : reply({ properties: data });
  }
  const parsed = accommodationPropertyId.safeParse(raw);
  if (!parsed.success) return reply({ error: "invalid" }, 400);
  const { data: allowed, error: accessError } = await db.rpc(
    "can_manage_accommodation_property",
    { p_property: parsed.data },
  );
  if (accessError) return reply({ error: "unavailable" }, 503);
  if (allowed !== true) return reply({ error: "forbidden" }, 403);
  const profile = await db
    .from("accommodation_properties")
    .select(
      "id,name,status,legacy_venue_id,workspace_id,slug,address,city,latitude,longitude,accommodation_type,website_url,description_es,description_en",
    )
    .eq("id", parsed.data)
    .maybeSingle();
  const sections = [
    "room_types",
    "units",
    "nightly_rates",
    "unit_blocks",
    "booking_settings",
    "reservations",
    "property_media",
  ] as const;
  const rows = await Promise.all(
    sections.map((section) =>
      db
        .from(`accommodation_${section}`)
        .select("*")
        .eq("property_id", parsed.data)
        .limit(100),
    ),
  );
  // Each section exposes its read failure; unknown inventory must never appear empty.
  return reply({
    profile: profile.error
      ? { error: "unavailable" }
      : { rows: profile.data ? [profile.data] : [] },
    ...Object.fromEntries(
      sections.map((section, index) => [
        section,
        rows[index].error
          ? { error: "unavailable" }
          : { rows: rows[index].data },
      ]),
    ),
  });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return reply({ error: "origin" }, 403);
  let body: unknown;
  try {
    body = JSON.parse(await readBoundedText(request, 20000));
  } catch (error) {
    return reply(
      { error: "invalid" },
      error instanceof RequestSecurityError ? error.status : 400,
    );
  }
  const parsed = accommodationOperation.safeParse(body);
  if (!parsed.success) return reply({ error: "invalid" }, 400);
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return reply({ error: "sign_in" }, 401);
  const terms = await accommodationApiTerms(db, user.id);
  if (terms)
    return reply({ error: terms }, terms === "unavailable" ? 503 : 403);
  const p = parsed.data;
  if (p.action === "create") {
    const result = await db.rpc("create_accommodation_property", {
      p_name: p.name,
      p_workspace: p.workspace ?? null,
    });
    return result.error
      ? reply({ error: "unavailable" }, 409)
      : reply({ property: result.data }, 201);
  }
  if (p.action === "review") {
    const reviewed = await db.rpc("review_accommodation_property", {
      p_property: p.property,
      p_publish: p.publish,
      p_revision: p.revision,
      p_reason: p.reason,
    });
    return reviewed.error
      ? reply({ error: "unavailable" }, 403)
      : reply({ ok: true });
  }
  const { data: allowed, error: accessError } = await db.rpc(
    "can_manage_accommodation_property",
    { p_property: p.property },
  );
  if (accessError) return reply({ error: "unavailable" }, 503);
  if (allowed !== true) return reply({ error: "forbidden" }, 403);
  let result;
  switch (p.action) {
    case "profile":
      result = await db.rpc("save_accommodation_property_profile", {
        p_property: p.property,
        p_profile: p.profile,
        p_submit: p.submit,
      });
      break;
    case "room_type": {
      const row = { name: p.name, max_guests: p.maxGuests, active: p.active };
      result = p.id
        ? await db
            .from("accommodation_room_types")
            .update(row)
            .eq("property_id", p.property)
            .eq("id", p.id)
            .select("id")
        : await db
            .from("accommodation_room_types")
            .insert({ ...row, property_id: p.property })
            .select("id");
      break;
    }
    case "unit": {
      const row = { name: p.name, room_type_id: p.roomType, active: p.active };
      result = p.id
        ? await db
            .from("accommodation_units")
            .update(row)
            .eq("property_id", p.property)
            .eq("id", p.id)
            .select("id")
        : await db
            .from("accommodation_units")
            .insert({ ...row, property_id: p.property })
            .select("id");
      break;
    }
    case "rate":
      result = await db
        .from("accommodation_nightly_rates")
        .insert({
          property_id: p.property,
          room_type_id: p.roomType,
          start_date: p.start,
          end_date_exclusive: p.end,
          nightly_price_cents: p.cents,
          minimum_nights: p.minimumNights,
        })
        .select("id");
      break;
    case "block":
      result = await db
        .from("accommodation_unit_blocks")
        .insert({
          property_id: p.property,
          unit_id: p.unit,
          start_date: p.start,
          end_date_exclusive: p.end,
        })
        .select("id");
      break;
    case "remove_rate":
    case "remove_block":
      result = await db
        .from(
          p.action === "remove_rate"
            ? "accommodation_nightly_rates"
            : "accommodation_unit_blocks",
        )
        .delete()
        .eq("property_id", p.property)
        .eq("id", p.id)
        .select("id");
      break;
    case "settings":
      result = await db
        .from("accommodation_booking_settings")
        .upsert(
          {
            property_id: p.property,
            mode: p.mode,
            external_url: p.externalUrl,
            policy: p.policy,
            notification_email: p.notificationEmail,
          },
          { onConflict: "property_id" },
        )
        .select("property_id");
      break;
    case "status": {
      const reservation = await db
        .from("accommodation_reservations")
        .select("id")
        .eq("property_id", p.property)
        .eq("id", p.reservation)
        .maybeSingle();
      if (reservation.error) return reply({ error: "unavailable" }, 503);
      if (!reservation.data) return reply({ error: "forbidden" }, 403);
      result = await db.rpc("accommodation_change_status", {
        p_reservation: p.reservation,
        p_status: p.status,
      });
      break;
    }
  }
  if (result.error) return reply({ error: "unavailable" }, 409);
  if (Array.isArray(result.data) && result.data.length === 0)
    return reply({ error: "not_found" }, 404);
  return reply({ result: result.data });
}
