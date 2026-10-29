import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
  requireUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));

import EventBookingPage from "../src/app/[locale]/events/[slug]/book/page";
import { BookingWizard } from "../src/components/BookingWizard";

import { requestEventBooking } from "../src/app/[locale]/events/[slug]/book/actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.requireUser.mockResolvedValue({ supabase: { rpc: mocks.rpc } });
});

function bookingForm() {
  const form = new FormData();
  Object.entries({
    locale: "en",
    slug: "local-event",
    eventId: "30000000-0000-4000-8000-000000000001",
    slotId: "30000000-0000-4000-8000-000000000002",
    partySize: "2",
    contactName: "Local Guest",
    contactEmail: "guest@example.test",
    contactPhone: "",
    notes: "",
    requestKey: "30000000-0000-4000-8000-000000000003",
    occurrence: "chosen-occurrence",
  }).forEach(([name, value]) => form.set(name, value));
  return form;
}

it("preserves the selected occurrence through auth and booking success", async () => {
  await expect(requestEventBooking(bookingForm())).rejects.toThrow(
    "redirect:/en/events/local-event/book?occurrence=chosen-occurrence&requested=1",
  );
  expect(mocks.requireUser).toHaveBeenCalledWith(
    "en",
    "/en/events/local-event/book?occurrence=chosen-occurrence",
  );
});

it("preserves the selected occurrence after validation failure", async () => {
  const form = bookingForm();
  form.set("partySize", "0");
  await expect(requestEventBooking(form)).rejects.toThrow(
    "redirect:/en/events/local-event/book?occurrence=chosen-occurrence&error=validation",
  );
  expect(mocks.rpc).not.toHaveBeenCalled();
});

const eventId = "30000000-0000-4000-8000-000000000001",
  venueId = "30000000-0000-4000-8000-000000000004";
const slot = {
  id: "30000000-0000-4000-8000-000000000002",
  starts_at: "2099-07-03T18:00:00Z",
  ends_at: "2099-07-03T19:00:00Z",
  capacity: 50,
  remaining: 2,
  offering_id: "30000000-0000-4000-8000-000000000005",
  offering_name: "Tour",
  resource_name: "Terrace",
};
function pageFixture({
  eventError = false,
  missing = false,
  availabilityError = false,
  slots = [slot],
  mode = "request",
  active = true,
  profileError = false,
}: {
  eventError?: boolean;
  missing?: boolean;
  availabilityError?: boolean;
  slots?: unknown;
  mode?: string;
  active?: boolean;
  profileError?: boolean;
} = {}) {
  const event = {
    id: eventId,
    title_es: "Concierto local",
    title_en: "Local concert",
    venue_id: venueId,
    event_occurrences: [{ id: "chosen-occurrence" }],
    venues: {
      name: "Local venue",
      venue_booking_settings: {
        mode,
        active,
        requires_deposit: true,
        deposit_cents: 1200,
        instructions_es: "Llega diez minutos antes.",
        instructions_en: null,
      },
      venue_availability_slots: [{ ...slot, remaining: 50 }],
    },
  };
  mocks.from.mockImplementation((table: string) => {
    const result =
      table === "events"
        ? {
            data: missing ? null : event,
            error: eventError ? { message: "Private internal detail" } : null,
          }
        : {
            data: profileError
              ? null
              : {
                  display_name: "Local Guest",
                  public_email: "public@example.test",
                  phone: "600000000",
                },
            error: profileError ? { message: "Private profile failure" } : null,
          };
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => result),
    };
    return query;
  });
  mocks.rpc.mockResolvedValue({
    data: slots,
    error: availabilityError ? { message: "Private database detail" } : null,
  });
  mocks.requireUser.mockResolvedValue({
    user: { id: "owner-profile", email: "account@example.test" },
    supabase: { from: mocks.from, rpc: mocks.rpc },
  });
  return event;
}
function findWizard(
  tree: ReactNode,
): ComponentProps<typeof BookingWizard> | undefined {
  if (!isValidElement(tree)) return;
  if (tree.type === BookingWizard)
    return tree.props as ComponentProps<typeof BookingWizard>;
  for (const child of Children.toArray(
    (tree.props as { children?: ReactNode }).children,
  )) {
    const found = findWizard(child);
    if (found) return found;
  }
}
const page = (
  locale = "en",
  query: Record<string, string> = { occurrence: "chosen-occurrence" },
) =>
  EventBookingPage({
    params: Promise.resolve({ locale, slug: "local-event" }),
    searchParams: Promise.resolve(query),
  });

it("uses authoritative remaining capacity and preserves event, occurrence and caller defaults", async () => {
  pageFixture();
  const tree = await page(),
    wizard = findWizard(tree);
  expect(mocks.rpc).toHaveBeenCalledWith("booking_available_slots", {
    p_venue: venueId,
  });
  expect(wizard?.slots).toEqual([slot]);
  expect(wizard?.offerings).toEqual({ [slot.offering_id]: "Tour" });
  expect(wizard?.event).toEqual({
    id: eventId,
    occurrence: "chosen-occurrence",
  });
  expect(wizard?.profile).toEqual({
    name: "Local Guest",
    email: "public@example.test",
    phone: "600000000",
  });
  expect(wizard?.submit).toBe(requestEventBooking);
  expect(mocks.requireUser).toHaveBeenCalledWith(
    "en",
    "/en/events/local-event/book?occurrence=chosen-occurrence",
  );
  const html = renderToStaticMarkup(tree);
  expect(html).toContain("2 places left");
  expect(html).not.toContain("50 places left");
  expect(html).toContain("No payment is taken");
});
it.each(["en", "es"])(
  "%s event read failure is unavailable, not a 404 or fabricated empty inventory",
  async (locale) => {
    pageFixture({ eventError: true });
    const tree = await page(locale),
      html = renderToStaticMarkup(tree);
    expect(findWizard(tree)).toBeUndefined();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(html).toContain('role="alert"');
    expect(html).toContain(
      `/${locale}/events/local-event/book?occurrence=chosen-occurrence`,
    );
    expect(html).not.toContain("Private internal detail");
  },
);
it.each(["en", "es"])(
  "%s availability error with stale data suppresses requests and retains occurrence retry",
  async (locale) => {
    pageFixture({ availabilityError: true });
    const tree = await page(locale),
      html = renderToStaticMarkup(tree);
    expect(findWizard(tree)).toBeUndefined();
    expect(html).toContain(
      `href="/${locale}/events/local-event/book?occurrence=chosen-occurrence"`,
    );
    expect(html).not.toContain("Private database detail");
    expect(html).toContain('role="alert"');
  },
);
it("does not represent an unexpected null availability payload as an empty calendar", async () => {
  pageFixture({ slots: null });
  const tree = await page();
  expect(findWizard(tree)).toBeUndefined();
  expect(renderToStaticMarkup(tree)).toContain(
    "cannot confirm whether places remain",
  );
});
it.each([
  { mode: "external", active: true },
  { mode: "disabled", active: true },
  { mode: "request", active: false },
])(
  "keeps $mode / active=$active event bookings outside the native request wizard",
  async (settings) => {
    pageFixture(settings);
    const tree = await page();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(findWizard(tree)).toBeUndefined();
    expect(renderToStaticMarkup(tree)).toContain(
      "does not accept requests here",
    );
  },
);
it.each(["en", "es"])(
  "%s genuine empty and full inventory do not invent bookable places",
  async (locale) => {
    pageFixture({ slots: [] });
    let tree = await page(locale);
    expect(findWizard(tree)?.slots).toEqual([]);
    expect(renderToStaticMarkup(tree)).toContain(
      locale === "es" ? "No hay horarios disponibles" : "No available dates",
    );
    pageFixture({ slots: [{ ...slot, remaining: 0 }] });
    tree = await page(locale);
    const html = renderToStaticMarkup(tree);
    expect(html).toContain(
      locale === "es" ? "No quedan plazas disponibles" : "No places available",
    );
    expect(html).not.toContain('id="customer-booking-form"');
    expect(html).not.toContain(locale === "es" ? "Continuar" : "Continue");
  },
);
it("keeps profile failure recoverable with only the authenticated account email default", async () => {
  pageFixture({ profileError: true });
  const wizard = findWizard(await page());
  expect(wizard?.profile).toEqual({
    name: "",
    email: "account@example.test",
    phone: "",
  });
});
it("drops an occurrence outside this event from submitted context and detail return", async () => {
  pageFixture();
  const tree = await page("en", { occurrence: "other-occurrence" });
  expect(findWizard(tree)?.event).toEqual({
    id: eventId,
    occurrence: undefined,
  });
  expect(renderToStaticMarkup(tree)).toContain('href="/en/events/local-event"');
});
it("keeps a successful missing event as not-found", async () => {
  pageFixture({ missing: true });
  await expect(page()).rejects.toThrow("not-found");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
