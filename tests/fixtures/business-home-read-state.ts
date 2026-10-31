/** Disposable read-only caller fixtures. Not evidence of live Auth/RLS or actions. */
export function businessHomeReadFixture({
  failure = "",
  empty = false,
  staff = false,
} = {}) {
  const calls: Array<[string, string, ...unknown[]]> = [];
  const venue = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Disposable venue",
    slug: "disposable-venue",
    status: "published",
    verified: false,
    discovery_vertical: "activities",
  };
  const event = {
    id: "event-fixture",
    venue_id: venue.id,
    slug: "fixture-event",
    title_es: "Evento de prueba",
    title_en: "Fixture event",
    status: "published",
    source: "venue",
    created_at: "2026-10-01",
    event_occurrences: [
      {
        id: "occurrence",
        starts_at: "2027-01-01T20:00:00Z",
        ends_at: "2027-01-01T22:00:00Z",
        status: "scheduled",
      },
    ],
  };
  const rows: Record<string, unknown> = {
    profiles: { app_role: staff ? "administrator" : "consumer" },
    venue_members: [{ role: "manager", venues: venue }],
    venues: staff
      ? { ...venue, id: "editorial-fixture", slug: "akipasa-editorial" }
      : null,
    categories: [{ id: "category", name_es: "Música", name_en: "Music" }],
    venue_claims: [
      {
        id: "claim",
        status: "pending",
        created_at: "2026-10-01",
        venues: { name: "Fixture claim" },
      },
    ],
    loyalty_programs: [
      {
        id: "programme",
        venue_id: venue.id,
        title_es: "Programa conocido",
        title_en: "Known programme",
        reward_es: "Recompensa",
        reward_en: "Reward",
        stamps_required: 8,
        check_in_token: "fixture-token",
        active: true,
      },
    ],
    reward_redemptions: [
      {
        id: "redemption",
        profiles: { display_name: "Fixture visitor" },
        loyalty_programs: { title_es: "Programa conocido", venue_id: venue.id },
      },
    ],
    promotion_requests: [
      {
        id: "promotion",
        venue_id: venue.id,
        service: "content_package",
        state: "requested",
      },
    ],
    car_rental_companies: [],
    events: [event],
    venue_media: [
      {
        id: "media",
        venue_id: venue.id,
        storage_path: "fixture/image.jpg",
        alt_es: "Prueba",
        alt_en: "Fixture",
      },
    ],
  };
  const error = { message: "Private database failure, never expose" };
  const supabase = {
    from(table: string) {
      let columns = "";
      const result = () => {
        const key =
          table === "events"
            ? columns.includes("event_occurrences")
              ? "managed-events"
              : "promotion-events"
            : table;
        return {
          data:
            failure === key
              ? null
              : empty &&
                  !["profiles", "venue_members", "venues"].includes(table)
                ? []
                : (rows[table] ?? []),
          error:
            failure === key ||
            (failure === "profiles-partial" && table === "profiles")
              ? error
              : null,
        };
      };
      const query = {
        select(value: string) {
          columns = value;
          calls.push([table, "select", value]);
          return query;
        },
        eq(...args: unknown[]) {
          calls.push([table, "eq", ...args]);
          return query;
        },
        in(...args: unknown[]) {
          calls.push([table, "in", ...args]);
          return query;
        },
        order(...args: unknown[]) {
          calls.push([table, "order", ...args]);
          return query;
        },
        limit(...args: unknown[]) {
          calls.push([table, "limit", ...args]);
          return query;
        },
        maybeSingle() {
          return Promise.resolve(result());
        },
        then(resolve: (value: ReturnType<typeof result>) => unknown) {
          return Promise.resolve(result()).then(resolve);
        },
      };
      return query;
    },
    rpc: async (name: string, args: unknown) => {
      calls.push([name, "rpc", args]);
      return { data: [{ action: "open", total: 7 }], error: null };
    },
    storage: {
      from: () => ({
        createSignedUrls: async (paths: string[]) => ({
          data:
            failure === "signed-media"
              ? null
              : paths.map((path) => ({
                  path,
                  signedUrl: "/fixture.jpg",
                  error:
                    failure === "signed-media-item"
                      ? "Private signing failure"
                      : null,
                })),
          error: failure === "signed-media" ? error : null,
        }),
      }),
    },
  };
  return { supabase, user: { id: "fixture-manager" }, calls };
}
