// @vitest-environment jsdom
import React, { type ComponentProps } from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { DiscoveryResult } from "../src/lib/domain";

vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/es/account",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/personalisation/client", () => ({ trackBehaviour: vi.fn() }));
import { EventCard } from "../src/components/EventCard";
import { WorkspaceShell } from "../src/components/WorkspaceShell";
import { AccountItems } from "../src/app/[locale]/account/AccountItems";
import { AITeamDashboard } from "../src/app/[locale]/admin/ai-team/AITeamDashboard";
import { eventPriceLabel } from "../src/lib/event-price";
import { collectionHref } from "../src/lib/collection-links";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const occurrence = {
  id: "selected",
  startsAt: "2026-11-01T18:00:00Z",
  endsAt: "2026-11-01T20:00:00Z",
  status: "scheduled" as const,
};
const result: DiscoveryResult = {
  event: {
    id: "event",
    slug: "concert",
    title: { en: "Concert", es: "Concierto" },
    description: { es: "Descripción" },
    venueId: "venue",
    category: "music",
    priceCents: 1250,
    currency: "EUR",
    source: "verified_venue",
    sponsored: false,
    occurrences: [occurrence],
  },
  venue: {
    id: "venue",
    slug: "local",
    name: "Venue",
    description: { es: "Local" },
    locality: "Madrid",
    address: "Street",
    latitude: 40.4,
    longitude: -3.7,
    verified: true,
    accessible: true,
  },
  occurrence,
  distanceKm: 1,
};
it.each(
  (["en", "es"] as const).flatMap((locale) =>
    [0, 1250, 1299].map((priceCents) => ({ locale, priceCents })),
  ),
)("$locale card retains exact $priceCents cents", ({ locale, priceCents }) => {
  const event = { ...result.event, priceCents };
  render(<EventCard result={{ ...result, event }} locale={locale} />);
  const expected =
    priceCents === 0
      ? locale === "es"
        ? "Gratis"
        : "Free"
      : locale === "es"
        ? `${(priceCents / 100).toFixed(2).replace(".", ",")} €`
        : `€${(priceCents / 100).toFixed(2)}`;
  expect(screen.getByText(expected, { exact: true })).toBeVisible();
  expect(screen.getByRole("link")).toHaveAttribute(
    "href",
    `/${locale}/events/${event.slug}?occurrence=${occurrence.id}`,
  );
  expect(
    eventPriceLabel({ ...event, priceDisplayMode: "hide" }, locale),
  ).toBeNull();
});
it.each(["en", "es"] as const)(
  "$locale hidden card has no price badge",
  (locale) => {
    const { container } = render(
      <EventCard
        result={{
          ...result,
          event: { ...result.event, priceDisplayMode: "hide" },
        }}
        locale={locale}
      />,
    );
    expect(container.querySelector(".card-pill-price")).toBeNull();
  },
);

it.each(["en", "es"] as const)(
  "collection links use %s and keep occurrence/query/hash",
  (locale) => {
    render(
      <AccountItems
        locale={locale}
        items={[
          {
            id: "event",
            label: "Event",
            href: "/es/events/concert?occurrence=selected#book",
          },
        ]}
        emptyTitle="Empty"
        emptyDescription="None"
      />,
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/${locale}/events/concert?occurrence=selected#book`,
    );
    for (const href of [
      "https://example.com/es/events/concert",
      "//example.com/es/events/concert",
      "/es/events/../account",
      "/es/events/thing/other",
      "/es\\events/concert",
      "/account",
    ])
      expect(collectionHref(href, locale)).toBe(href);
  },
);

it("Spanish workspace labels and keyboard dismissal stay in Spanish", () => {
  render(
    <WorkspaceShell
      title="Cuenta"
      eyebrow="Mi espacio"
      description="Datos"
      homeHref="/es/account"
      items={[{ href: "/es/account", label: "Inicio", icon: "home" }]}
    >
      <p>Content</p>
    </WorkspaceShell>,
  );
  expect(
    screen.getByRole("button", { name: "Contraer navegación" }),
  ).toBeVisible();
  expect(
    screen.getByRole("navigation", { name: "Secciones de Cuenta" }),
  ).toBeVisible();
  const opener = screen.getByRole("button", {
    name: "Menú de Cuenta · Mi espacio",
  });
  fireEvent.click(opener);
  expect(
    screen.getByRole("complementary", { name: "Navegación de Cuenta" }),
  ).toBeVisible();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(opener).toHaveAttribute("aria-expanded", "false");
  expect(opener).toHaveFocus();
});

const initial: ComponentProps<typeof AITeamDashboard>["initial"] = {
  agents: [
    {
      id: "one",
      agent_key: "helper",
      display_name: "Helper",
      role_description: "Help",
      system_instructions: "Help",
      permissions: [],
      provider: "openai",
      model: "model",
      status: "idle",
      enabled: true,
      last_active_at: null,
      last_error: null,
    },
  ],
  messages: [],
  tasks: [],
  approvals: [],
  activity: [],
  schedules: [],
  usage: [],
  budget: {
    monthly_limit_eur: 0,
    hard_cap_enabled: true,
    requests_per_minute: 1,
    requests_per_hour: 1,
    max_concurrent_requests: 1,
  },
};
it.each(["en", "es"] as const)(
  "%s AI failures remain visible with loaded agents and hide false empty lists",
  (locale) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(
      <AITeamDashboard
        locale={locale}
        providerConfigured
        setupError="read_failed"
        readErrors={{ approvals: true, usage: true }}
        initial={initial}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      locale === "es" ? "Aprobaciones" : "Approvals",
    );
    const metric = screen.getByText(
      locale === "es" ? "Aprobaciones" : "Approvals",
      { selector: "article > span" },
    ).parentElement!;
    expect(within(metric).getByText("—")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "es" ? "Aprobaciones" : "Approvals",
      }),
    );
    expect(
      screen.queryByText(/No .*approvals|No hay aprobaciones/i),
    ).toBeNull();
    expect(
      screen.getByRole("link", {
        name: locale === "es" ? "Reintentar" : "Retry",
      }),
    ).toHaveAttribute("href", `/${locale}/admin/ai-team`);
    expect(fetch).not.toHaveBeenCalled();
  },
);
it("a configured zero budget stays zero rather than becoming EUR4", () => {
  render(
    <AITeamDashboard
      locale="en"
      providerConfigured
      setupError={null}
      initial={initial}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Usage & budget" }));
  expect(
    screen.getByRole("spinbutton", { name: "Monthly limit (€)" }),
  ).toHaveValue(0);
  expect(screen.queryByText("€4.00")).toBeNull();
});

it.each([
  { days: 7, expected: "09/09/2026" },
  { days: 30, expected: "02/10/2026" },
  { days: 60, expected: "01/11/2026" },
])(
  "uses returned expiry for a $days-day passport with Madrid midnight conversion",
  async ({ days, expected }) => {
    const { passportDeadlineLabel } = await import(
      "../src/lib/passport-deadline"
    );
    const expiry = new Date(
      Date.parse("2026-09-01T23:30:00Z") + days * 86400000,
    ).toISOString();
    for (const locale of ["en", "es"] as const) {
      expect(passportDeadlineLabel(expiry, locale)).toBe(expected);
      expect(passportDeadlineLabel("invalid", locale)).toBe("—");
    }
    expect(passportDeadlineLabel("2026-10-14T22:30:00Z", "en")).toBe(
      "15/10/2026",
    );
  },
);

it("localizes every stored Passport claim and enrollment state", async () => {
  const { passportStatusLabel } = await import("../src/lib/passport-status");
  expect(passportStatusLabel("claim", "ready", "en")).toBe("Ready to redeem");
  expect(passportStatusLabel("claim", "redeemed", "es")).toBe("Canjeada");
  expect(passportStatusLabel("claim", "expired", "es")).toBe("Caducada");
  expect(passportStatusLabel("enrollment", "active", "es")).toBe("En curso");
  expect(passportStatusLabel("enrollment", "completed", "en")).toBe(
    "Completed",
  );
  expect(passportStatusLabel("enrollment", "redeemed", "es")).toBe(
    "Recompensa solicitada",
  );
  expect(passportStatusLabel("enrollment", "expired", "en")).toBe("Expired");
});

it("does not expose an unexpected Passport backend state", async () => {
  const { passportStatusLabel } = await import("../src/lib/passport-status");
  expect(passportStatusLabel("claim", "internal_new_state", "en")).toBe(
    "Unknown status",
  );
  expect(passportStatusLabel("enrollment", null, "es")).toBe(
    "Estado desconocido",
  );
});
