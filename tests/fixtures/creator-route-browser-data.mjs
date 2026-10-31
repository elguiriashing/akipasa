// Disposable browser-only adapters. Never connected to a database or provider.
export const ownerId = "10000000-0000-4000-8000-000000000001";
export const otherId = "10000000-0000-4000-8000-000000000002";
export const categoryId = "20000000-0000-4000-8000-000000000001";
const args = () => new URLSearchParams(location.search);
export const currentUser = () =>
  args().get("user") === "other" ? otherId : ownerId;
export function resetFixture() {
  const previous = JSON.parse(
    sessionStorage.getItem("creator-fixture-redirect-trace") || "null",
  );
  sessionStorage.removeItem("creator-fixture-redirect-trace");
  window.__creatorReads = previous?.reads || [];
  window.__creatorWrites = previous?.writes || [];
  window.__creatorAuth = previous?.auth || [];
  window.__creatorActionResults = previous?.actions || [];
}
function profile(id = ownerId) {
  const empty = args().get("fixture") === "empty";
  const name =
    id === otherId ? "Second synthetic creator" : "Synthetic creator Ana";
  return {
    profile_id: id,
    slug: id === otherId ? "second-fixture" : "ana-fixture",
    display_name: name,
    headline_es: "Experiencias de prueba · sin actividad real",
    headline_en: "Disposable experiences · no real activity",
    bio_es:
      "Perfil sintético de pruebas de interfaz. No describe a una persona ni un evento real.",
    bio_en:
      "Synthetic interface test profile. This is not a real person or real event.",
    locality: "Fixture area",
    province: "Fixture province",
    avatar_url: "/fixture.svg",
    cover_url: empty ? null : "/fixture.svg",
    website_url: null,
    instagram_url: null,
    youtube_url: null,
    state: "published",
    verification_state: "none",
    updated_at: "2026-10-29T10:00:00Z",
    creator_categories: empty
      ? []
      : [
          {
            categories: {
              slug: "fixture-art",
              name_es: "Arte de prueba",
              name_en: "Fixture art",
            },
          },
        ],
    creator_reviews: empty
      ? []
      : [
          {
            rating: 4,
            body: "Synthetic review used only for layout testing.",
            created_at: "2026-10-28T10:00:00Z",
          },
        ],
    events: empty ? [] : [event()],
  };
}
function event() {
  const start = new Date(Date.now() + 86_400_000).toISOString();
  const end = new Date(Date.now() + 90_000_000).toISOString();
  return {
    id: "30000000-0000-4000-8000-000000000001",
    slug: "synthetic-event",
    title_es: "Evento sintético de prueba",
    title_en: "Synthetic fixture event",
    description_es: "No es un evento real.",
    description_en: "Not a real event.",
    status: "published",
    created_at: "2026-10-28T10:00:00Z",
    event_occurrences: [{ starts_at: start, ends_at: end }],
    venues: {
      name: "Synthetic venue",
      venue_media: [
        {
          storage_path: "fixture-event",
          alt_en: "Synthetic illustration",
          alt_es: "Ilustración sintética",
        },
      ],
    },
  };
}
function client(publicRead) {
  return {
    from(table) {
      const read = { table, filters: [], publicRead, operation: "select" };
      window.__creatorReads.push(read);
      let singular = false;
      const request = {
        select(columns) {
          read.columns = columns;
          return request;
        },
        eq(key, value) {
          read.filters.push([key, value]);
          return request;
        },
        in(key, value) {
          read.filters.push([key, value]);
          return request;
        },
        order() {
          return request;
        },
        limit() {
          return request;
        },
        or() {
          return request;
        },
        ilike() {
          return request;
        },
        maybeSingle() {
          singular = true;
          return Promise.resolve(result());
        },
        upsert(data, options) {
          return mutate("upsert", data, options);
        },
        insert(data) {
          return mutate("insert", data);
        },
        update(data) {
          return mutate("update", data);
        },
        delete() {
          return mutate("delete", null);
        },
        then(resolve, reject) {
          return Promise.resolve(result()).then(resolve, reject);
        },
      };
      function mutate(operation, data, options) {
        read.operation = operation;
        const write = {
          table,
          operation,
          data,
          options,
          filters: read.filters,
        };
        window.__creatorWrites.push(write);
        return request;
      }
      function result() {
        const mode = args().get("fixture") || "ready";
        if (read.operation !== "select")
          return {
            data: null,
            error:
              args().get("write") === "error"
                ? { message: "Private synthetic mutation failure" }
                : null,
          };
        const failure =
          (mode === "profile-error" && table === "creator_profiles") ||
          (mode === "categories-error" && table === "categories") ||
          (mode === "selected-error" && table === "creator_categories") ||
          (mode === "events-error" && table === "events");
        if (failure)
          return {
            data: null,
            error: { message: "Private synthetic read failure" },
          };
        if (table === "creator_profiles") {
          if (mode === "missing") return { data: null, error: null };
          if (publicRead)
            return { data: singular ? profile() : [profile()], error: null };
          if (
            !read.filters.some(
              ([key, id]) => key === "profile_id" && id === currentUser(),
            )
          )
            throw new Error("Studio profile read escaped caller scope");
          return {
            data:
              mode === "empty"
                ? null
                : {
                    ...profile(currentUser()),
                    avatar_url: null,
                    cover_url: null,
                  },
            error: null,
          };
        }
        if (table === "categories")
          return {
            data: [
              {
                id: categoryId,
                slug: "fixture-art",
                name_es: "Arte de prueba",
                name_en: "Fixture art",
              },
            ],
            error: null,
          };
        if (table === "creator_categories")
          return {
            data: mode === "empty" ? [] : [{ category_id: categoryId }],
            error: null,
          };
        if (table === "events")
          return { data: mode === "empty" ? [] : [event()], error: null };
        if (table === "event_submissions") return { data: [], error: null };
        return { data: [], error: null };
      }
      return request;
    },
    async rpc(name, input) {
      window.__creatorReads.push({ rpc: name, input, publicRead });
      return {
        data: {
          eligible: args().get("fixture") === "session-expired-verify",
          published_events: 1,
          participants: 2,
          required_events: 5,
          required_participants: 20,
        },
        error:
          args().get("fixture") === "eligibility-error"
            ? { message: "Private eligibility failure" }
            : null,
      };
    },
    storage: {
      from() {
        return {
          async createSignedUrls(paths) {
            return {
              data: paths.map((path) => ({ path, signedUrl: "/fixture.svg" })),
              error: null,
            };
          },
        };
      },
    },
  };
}
export function createSupabasePublicClient() {
  return client(true);
}
export async function requireUser(locale, next = `/${locale}/account`) {
  window.__creatorAuth.push({ locale, next });
  if (args().get("user") === "guest")
    throw Object.assign(new Error("Fixture guest redirect"), {
      fixtureRedirect: `/${locale}/auth?${new URLSearchParams({ next })}`,
    });
  return { user: { id: currentUser() }, supabase: client(false) };
}
