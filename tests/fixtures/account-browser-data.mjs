// Disposable data for the account browser harness. No live credentials or writes.
const hours = 60 * 60 * 1000;
const iso = (offset) => new Date(Date.now() + offset * hours).toISOString();
const date = (offset) => iso(offset).slice(0, 10);
const query = () => new URLSearchParams(location.search);
const scenario = () => query().get("fixture") || "populated";
const locale = () => (location.pathname.startsWith("/es/") ? "es" : "en");
const premium = () => scenario() !== "free";
const isEmpty = () => scenario() === "empty";

export const accentFixture = "Málaga · poesía · Tradición · ÁÉÍÓÚ Ñ Ç";
export const longFixture =
  "Celebración de música, gastronomía y poesía en Málaga — ÁÉÍÓÚ Ñ Ç — una tarde entre amigos junto al paseo marítimo";

function profile() {
  return {
    id: "account-browser-user",
    display_name:
      scenario() === "long"
        ? "MaríaÁngelesDelMarExtraordinariamenteLargo"
        : "María Ángeles",
    app_role: "consumer",
    preferred_locale: locale(),
    membership_tier: premium() ? "premium" : "free",
    business_plan_active: false,
    business_tier: null,
    username: "maria_angeles",
    bio: accentFixture,
    phone: "+34 600 000 001",
    public_email: "maria.angeles.disposable.browser@example.test",
    avatar_url: null,
    banner_url: null,
    website_url: "https://example.test",
    instagram_url: "https://instagram.com/disposable_account",
    locality: "Málaga",
    province: "Málaga",
    birth_year: 1990,
    gender: "",
    profile_visibility: "public",
    contact_visibility: "private",
    attendance_visibility: "private",
  };
}

function collection(venue = false) {
  if (isEmpty()) return [];
  return Array.from({ length: 13 }, (_, index) => ({
    event_key: `event-fixture-${index}`,
    venue_key: `venue-fixture-${index}`,
    title:
      index === 0
        ? accentFixture
        : index === 1
          ? longFixture
          : `Plan de prueba ${String(index + 1).padStart(2, "0")}`,
    name:
      index === 0
        ? accentFixture
        : index === 1
          ? longFixture
          : `Local de prueba ${String(index + 1).padStart(2, "0")}`,
    href: `/${locale()}/${venue ? "venues" : "events"}/disposable-${index}`,
    created_at: iso(-index * 24),
    viewed_at: iso(-index * 24),
  }));
}

function stays() {
  if (isEmpty()) return [];
  return [
    ["requested", 7 * 24, 10 * 24],
    ["confirmed", -24, 24],
    ["completed", -10 * 24, -7 * 24],
  ].map(([status, start, end], index) => ({
    id: `10000000-0000-4000-8000-00000000000${index}`,
    check_in: date(start),
    check_out: date(end),
    status,
    guests: 2,
    quoted_total_cents: 23500,
    quote_snapshot: {
      room_name: index ? "Habitación de prueba" : longFixture,
      property_name: "Alojamiento de prueba Málaga",
      venue_name: "Alojamiento de prueba Málaga",
      property_slug: "disposable-stay",
      venue_slug: "disposable-stay",
    },
  }));
}

function rows(table) {
  switch (table) {
    case "profiles":
      return [profile()];
    case "saved_event_refs":
    case "recent_event_view_refs":
      return collection();
    case "followed_venue_refs":
      return collection(true);
    case "xp_ledger":
      return [{ delta: 120 }, { delta: 20 }];
    case "accommodation_reservations":
      return stays();
    case "account_deletion_requests":
      return scenario() === "pending"
        ? [{ state: "requested", requested_at: iso(-24) }]
        : [];
    case "personalisation_settings":
      return [{ personalisation_enabled: false, marketing_enabled: false }];
    case "billing_subscriptions":
      return premium()
        ? [
            {
              plan_code: "premium",
              billing_interval: "month",
              status: "active",
              current_period_end: iso(30 * 24),
              cancel_at_period_end: false,
            },
          ]
        : [];
    case "staff_billing_grants":
      return [];
    case "billing_customers":
      return premium()
        ? [{ stripe_customer_id: "cus_disposable_fixture" }]
        : [];
    default:
      throw new Error(`Account browser fixture needs table ${table}`);
  }
}

class FixtureQuery {
  constructor(table) {
    this.table = table;
    this.single = false;
    this.head = false;
    this.count = false;
    this.maximum = Infinity;
  }
  select(_columns, options = {}) {
    this.head = options.head === true;
    this.count = options.count === "exact";
    return this;
  }
  eq() {
    return this;
  }
  in() {
    return this;
  }
  order() {
    return this;
  }
  limit(value) {
    this.maximum = value;
    return this;
  }
  range(from, to) {
    this.maximum = to - from + 1;
    return this;
  }
  maybeSingle() {
    this.single = true;
    return this;
  }
  then(onFulfilled, onRejected) {
    const fail =
      (scenario() === "profile-error" && this.table === "profiles") ||
      (scenario() === "privacy-error" &&
        ["personalisation_settings", "account_deletion_requests"].includes(
          this.table,
        )) ||
      (scenario() === "billing-error" &&
        [
          "billing_subscriptions",
          "billing_customers",
          "staff_billing_grants",
        ].includes(this.table)) ||
      (scenario() === "error" &&
        [
          "saved_event_refs",
          "followed_venue_refs",
          "recent_event_view_refs",
          "accommodation_reservations",
        ].includes(this.table));
    const data = rows(this.table);
    return Promise.resolve({
      data: fail
        ? null
        : this.head
          ? null
          : this.single
            ? data[0] || null
            : data.slice(0, this.maximum),
      count: fail ? null : this.count ? data.length : null,
      error: fail
        ? { message: "Disposable account fixture read failed" }
        : null,
    }).then(onFulfilled, onRejected);
  }
}

const supabase = {
  from(table) {
    return new FixtureQuery(table);
  },
  async rpc(name, args = {}) {
    if (name === "suite_email_reminder_preferences") {
      return {
        data: { event_reminders: false, stay_reminders: false },
        error: null,
      };
    }
    if (name === "has_active_entitlement") {
      if (scenario() === "error") {
        return {
          data: null,
          error: { message: "Disposable entitlement failure" },
        };
      }
      return { data: premium(), error: null };
    }
    if (name === "my_booking_history") {
      if (scenario() === "error") {
        return { data: null, error: { message: "Disposable booking failure" } };
      }
      const tab = args.p_tab || "upcoming";
      const times =
        tab === "past" ? [-72, -70] : tab === "active" ? [-1, 1] : [168, 170];
      return {
        data: {
          bookings: isEmpty()
            ? []
            : [
                {
                  id: "20000000-0000-4000-8000-000000000000",
                  party_size: 2,
                  status: tab === "past" ? "completed" : "confirmed",
                  created_at: iso(-48),
                  venue: {
                    name: longFixture,
                    slug: "disposable-venue",
                    address: "Avenida de la Constitución, Málaga, España",
                  },
                  offeringName: "Cena y música en directo",
                  slot: { starts_at: iso(times[0]), ends_at: iso(times[1]) },
                },
              ],
          counts: isEmpty()
            ? { upcoming: 0, active: 0, past: 0 }
            : { upcoming: 21, active: 1, past: 1 },
        },
        error: null,
      };
    }
    throw new Error(`Account browser fixture needs RPC ${name}`);
  },
};

export async function requireUser() {
  return {
    supabase,
    user: {
      id: "account-browser-user",
      email: "maria.angeles.disposable.browser@example.test",
      new_email:
        scenario() === "pending" ? "pending.disposable@example.test" : null,
    },
  };
}

export async function viewerProfile() {
  return profile();
}

export function recordAction(name, form) {
  const fields = Object.fromEntries(form);
  const result = { name, fields };
  window.__accountActions ||= [];
  window.__accountActions.push(result);
  window.__accountAction = result;
  return Promise.resolve();
}
