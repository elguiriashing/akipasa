// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { AccountItems } from "../src/app/[locale]/account/AccountItems";
import { AccountStayBookings } from "../src/app/[locale]/account/AccountStayBookings";
import SavedEventsPage from "../src/app/[locale]/account/saved/page";
import FollowingPage from "../src/app/[locale]/account/following/page";
import ActivityPage from "../src/app/[locale]/account/activity/page";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  requireUser: vi.fn(),
  reminder: vi.fn(async () => {}),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
  notFound: () => {
    throw new Error("Not found");
  },
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("../src/app/[locale]/account/saved/actions", () => ({
  setSavedEventReminder: mocks.reminder,
}));
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const item = {
  id: "event-one",
  label: "Málaga · poesía · Tradición · ÁÉÍÓÚ Ñ Ç",
  href: "/es/events/poesia-malaga",
  date: "2026-10-11T23:30:00Z",
};
const emptyCopy = {
  emptyTitle: "Nothing saved yet",
  emptyDescription: "Save an event to find it here.",
};

describe("account collections", () => {
  it.each([
    ["saved", "Ver evento", "Guardado el"],
    ["following", "Ver local", "Siguiendo desde"],
    ["activity", "Volver al evento", "Visto el"],
  ] as const)(
    "preserves the full label and destination in %s cards",
    (kind, openLabel, dateLabel) => {
      render(
        <AccountItems locale="es" kind={kind} items={[item]} {...emptyCopy} />,
      );
      expect(
        screen.getByRole("link", { name: `${openLabel}: ${item.label}` }),
      ).toHaveAttribute("href", item.href);
      expect(screen.getByText(item.label)).toBeVisible();
      expect(screen.getByText(new RegExp(dateLabel))).toHaveTextContent(
        "12 oct 2026",
      );
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      if (kind === "activity")
        expect(screen.getByText("Últimos 25 eventos")).toBeVisible();
    },
  );

  it.each(["en", "es"] as const)(
    "provides a real localized Explore action for an empty %s collection",
    (locale) => {
      render(<AccountItems locale={locale} items={[]} {...emptyCopy} />);
      expect(
        screen.getByRole("heading", { name: emptyCopy.emptyTitle }),
      ).toBeVisible();
      expect(
        screen.getByRole("link", {
          name: locale === "es" ? "Explorar" : "Explore",
        }),
      ).toHaveAttribute("href", `/${locale}`);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  it("never presents a failed read as empty and refreshes only on an explicit retry", () => {
    render(<AccountItems locale="en" items={[]} failed {...emptyCopy} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This list could not be loaded",
    );
    expect(screen.queryByText(emptyCopy.emptyTitle)).not.toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("keeps a valid record usable when its optional date is malformed", () => {
    render(
      <AccountItems
        locale="en"
        items={[{ ...item, date: "invalid" }]}
        {...emptyCopy}
      />,
    );
    expect(
      screen.getByRole("link", { name: `View event: ${item.label}` }),
    ).toHaveAttribute("href", item.href);
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });
});

function mockCollectionReads({
  readError = false,
  preferences = { event_reminders: false, stay_reminders: true },
  preferenceError = false,
}: {
  readError?: boolean;
  preferences?: { event_reminders: boolean; stay_reminders: boolean } | null;
  preferenceError?: boolean;
} = {}) {
  const reply = {
    data: readError ? null : [],
    error: readError ? { code: "unavailable" } : null,
  };
  const query = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: (value: typeof reply) => unknown) =>
      Promise.resolve(reply).then(resolve),
  };
  const rpc = vi.fn().mockResolvedValue({
    data: preferences,
    error: preferenceError ? { code: "unavailable" } : null,
  });
  const from = vi.fn().mockReturnValue(query);
  mocks.requireUser.mockResolvedValue({
    supabase: { from, rpc },
    user: { id: "current-user" },
  });
  return { rpc, from, query };
}

describe("collection loaders and reminder consent", () => {
  it.each([
    ["saved", SavedEventsPage, "saved_event_refs"],
    ["following", FollowingPage, "followed_venue_refs"],
    ["activity", ActivityPage, "recent_event_view_refs"],
  ] as const)(
    "shows %s read failure instead of an empty collection",
    async (_name, Page, table) => {
      const { from } = mockCollectionReads({ readError: true });
      render(await Page({ params: Promise.resolve({ locale: "en" }) }));
      expect(mocks.requireUser).toHaveBeenCalledWith("en");
      expect(from).toHaveBeenCalledWith(table);
      expect(screen.getByRole("alert")).toHaveTextContent(
        "This list could not be loaded",
      );
    },
  );

  it("reads reminder settings without opting the user in and retains the explicit enable action", async () => {
    const { rpc } = mockCollectionReads();
    const { container } = render(
      await SavedEventsPage({ params: Promise.resolve({ locale: "en" }) }),
    );
    expect(rpc).toHaveBeenCalledWith("suite_email_reminder_preferences", {
      p_event: null,
      p_stay: null,
    });
    expect(screen.getByText("Off")).toBeVisible();
    expect(container.querySelector('input[name="enabled"]')).toHaveValue(
      "true",
    );
    expect(container.querySelector('input[name="locale"]')).toHaveValue("en");
    expect(mocks.reminder).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Enable emails" })).toBeEnabled();
  });

  it("keeps an opted-in reminder explicit and submits the existing disable value", async () => {
    mockCollectionReads({
      preferences: { event_reminders: true, stay_reminders: true },
    });
    const { container } = render(
      await SavedEventsPage({ params: Promise.resolve({ locale: "es" }) }),
    );
    expect(screen.getByText("Activados")).toBeVisible();
    expect(container.querySelector('input[name="enabled"]')).toHaveValue(
      "false",
    );
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeEnabled();
    expect(mocks.reminder).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "disables consent changes when preferences cannot be read (RPC error: %s)",
    async (preferenceError) => {
      mockCollectionReads({ preferenceError, preferences: null });
      const { container } = render(
        await SavedEventsPage({ params: Promise.resolve({ locale: "en" }) }),
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Your preference could not be loaded",
      );
      expect(screen.getByText("Unavailable")).toBeVisible();
      expect(container.querySelector('input[name="enabled"]')).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Enable emails" }),
      ).not.toBeInTheDocument();
      expect(mocks.reminder).not.toHaveBeenCalled();
    },
  );

  it("keeps the activity read bounded to the latest 25 events", async () => {
    const { query } = mockCollectionReads();
    await ActivityPage({ params: Promise.resolve({ locale: "es" }) });
    expect(query.limit).toHaveBeenCalledWith(25);
    expect(query.order).toHaveBeenCalledWith("viewed_at", { ascending: false });
  });
});

const stay = {
  id: "00000000-0000-4000-8000-000000000001",
  check_in: "2026-10-24",
  check_out: "2026-10-28",
  status: "confirmed",
  guests: 2,
  quoted_total_cents: 32150,
  quote_snapshot: { room_name: "Habitación Málaga · ÁÉÍÓÚ Ñ Ç" },
};

describe("account stay cards", () => {
  it.each(["en", "es"] as const)(
    "keeps localized dates/status and an explicit cancellation confirmation in %s",
    async (locale) => {
      const cancel = vi.fn(async () => {});
      const { container } = render(
        <AccountStayBookings locale={locale} stays={[stay]} cancel={cancel} />,
      );
      expect(
        screen.getByRole("heading", { name: stay.quote_snapshot.room_name }),
      ).toBeVisible();
      expect(
        screen.getByText(locale === "es" ? "Confirmada" : "Confirmed"),
      ).toBeVisible();
      expect(
        container.querySelector('time[datetime="2026-10-24"]'),
      ).toHaveTextContent(/24.*2026/);
      const confirmLabel =
        locale === "es" ? "Sí, cancelar estancia" : "Yes, cancel stay";
      expect(
        screen.queryByRole("button", { name: confirmLabel }),
      ).not.toBeVisible();
      fireEvent.click(
        screen.getByText(
          locale === "es" ? "Detalles y opciones" : "Details and options",
        ),
      );
      expect(screen.getByText(stay.id)).toBeVisible();
      fireEvent.click(
        screen.getByText(locale === "es" ? "Cancelar estancia" : "Cancel stay"),
      );
      const button = screen.getByRole("button", { name: confirmLabel });
      expect(button).toBeVisible();
      expect(cancel).not.toHaveBeenCalled();
      const form = button.closest("form")!;
      expect(within(form).getByDisplayValue(locale)).toHaveAttribute(
        "name",
        "locale",
      );
      expect(within(form).getByDisplayValue(stay.id)).toHaveAttribute(
        "name",
        "bookingId",
      );
      fireEvent.submit(form);
      await waitFor(() => expect(cancel).toHaveBeenCalledOnce());
      const submitted = (cancel.mock.calls as unknown as [[FormData]])[0][0];
      expect(Object.fromEntries(submitted)).toEqual({
        locale,
        bookingId: stay.id,
      });
    },
  );

  it.each(["completed", "cancelled", "declined", "checked_in"])(
    "does not offer cancellation for a %s stay",
    (status) => {
      const { container } = render(
        <AccountStayBookings
          locale="en"
          stays={[{ ...stay, status }]}
          cancel={vi.fn(async () => {})}
        />,
      );
      expect(container.querySelector("form")).toBeNull();
    },
  );

  it("shows accommodation read failure independently from an empty state", () => {
    render(
      <AccountStayBookings
        locale="es"
        stays={[]}
        failed
        cancel={vi.fn(async () => {})}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se han podido cargar las estancias",
    );
    expect(
      screen.queryByText("Tu próxima escapada te espera"),
    ).not.toBeInTheDocument();
  });
});
