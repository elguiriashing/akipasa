// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CheckinStories } from "./CheckinStories";
const id = "00000000-0000-4000-8000-000000000001";
const storyId = "00000000-0000-4000-8000-000000000002";
const fetcher = vi.fn();
const checkIn = {
  id,
  venueName: "Known venue",
  citySlug: "malaga",
  acceptedAt: "2026-10-31T12:00:00Z",
};
const story = (status = "pending") => ({
  id: storyId,
  venueName: "Known venue",
  citySlug: "malaga",
  caption: "My own caption",
  kind: "venue",
  status,
  createdAt: "2026-10-31T12:00:00Z",
  expiresAt: "2026-11-01T12:00:00Z",
  mediaUrl: `/api/community/stories/${storyId}/media`,
});
const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
vi.mock("./CheckinStoryComposer", () => ({
  CheckinStoryComposer: ({
    checkInId,
    venueName,
  }: {
    checkInId: string;
    venueName: string;
  }) => (
    <div data-testid="composer">
      {checkInId} · {venueName}
    </div>
  ),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetcher);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  fetcher.mockImplementation(async (url: string, options?: RequestInit) =>
    options?.method === "DELETE"
      ? response({ deleted: true, mediaCleanup: "removed" })
      : url.endsWith("check-ins")
        ? response({ available: true, checkIns: [checkIn] })
        : response({ available: true, stories: [story()] }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function open(locale: "en" | "es" = "en") {
  render(<CheckinStories locale={locale} />);
  const button = screen.getByRole("button", {
    name: locale === "es" ? "Añadir historia" : "Add story",
  });
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(button);
  await screen.findByRole("combobox");
  return button;
}
for (const locale of ["en", "es"] as const) {
  it(`${locale} loads owned eligible records only after native launcher interaction and selects composer`, async () => {
    await open(locale);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("composer")).toBeNull();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: id } });
    expect(screen.getByTestId("composer")).toHaveTextContent(id);
    expect(screen.getByTestId("composer")).toHaveTextContent("Known venue");
    expect(
      fetcher.mock.calls.every(
        ([, o]) => o.credentials === "same-origin" && o.cache === "no-store",
      ),
    ).toBe(true);
  });
  it(`${locale} genuinely empty eligible records offer working verified check-in path`, async () => {
    fetcher.mockImplementation(async (url: string) =>
      url.endsWith("check-ins")
        ? response({ available: true, checkIns: [] })
        : response({ available: true, stories: [] }),
    );
    render(<CheckinStories locale={locale} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "es" ? "Añadir historia" : "Add story",
      }),
    );
    const link = await screen.findByRole("link", {
      name: locale === "es" ? "Ir a Check-in" : "Go to Check-in",
    });
    expect(link).toHaveAttribute("href", `/${locale}/check-in`);
    expect(screen.queryByTestId("composer")).toBeNull();
  });
  it(`${locale} requires explicit confirmation before real deletion, then removes only successful row`, async () => {
    await open(locale);
    await screen.findByText("My own caption");
    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "es" ? "Retirar historia" : "Remove story",
      }),
    );
    expect(fetcher.mock.calls.some(([, o]) => o.method === "DELETE")).toBe(
      false,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "es" ? "Confirmar retirada" : "Confirm removal",
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText("My own caption")).toBeNull(),
    );
    expect(
      fetcher.mock.calls.filter(([, o]) => o.method === "DELETE"),
    ).toHaveLength(1);
    expect(fetcher.mock.calls.find(([, o]) => o.method === "DELETE")?.[0]).toBe(
      `/api/community/stories/${storyId}`,
    );
  });
  it(`${locale} keeps story when user cancels removal`, async () => {
    await open(locale);
    await screen.findByText("My own caption");
    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "es" ? "Retirar historia" : "Remove story",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "es" ? "Conservar" : "Keep story",
      }),
    );
    expect(screen.getByText("My own caption")).toBeVisible();
    expect(fetcher.mock.calls.some(([, o]) => o.method === "DELETE")).toBe(
      false,
    );
  });
}
it.each([401, 503])(
  "handles GET %s without fabricated empty/success state",
  async (status) => {
    fetcher.mockResolvedValue(
      response(
        { error: { code: "unavailable", message: "PRIVATE STACK" } },
        status,
      ),
    );
    render(<CheckinStories locale="en" />);
    fireEvent.click(screen.getByRole("button", { name: "Add story" }));
    await screen.findAllByRole("alert");
    expect(screen.queryByText("PRIVATE STACK")).toBeNull();
    expect(screen.queryByText("You have no current stories yet.")).toBeNull();
    if (status === 401)
      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        "/en/auth?next=%2Fen%2Fcommunity",
      );
    else
      expect(
        screen.getAllByRole("button", { name: "Retry" }).length,
      ).toBeGreaterThan(0);
  },
);
it("keeps healthy own stories on independent eligible-check-in failure and retries fresh GET", async () => {
  let fail = true;
  fetcher.mockImplementation(async (url: string) =>
    url.endsWith("check-ins")
      ? fail
        ? response({ error: { code: "unavailable" } }, 503)
        : response({ available: true, checkIns: [checkIn] })
      : response({ available: true, stories: [story()] }),
  );
  render(<CheckinStories locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: "Add story" }));
  await screen.findByRole("alert");
  expect(await screen.findByText("My own caption")).toBeVisible();
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByRole("combobox");
  expect(fetcher).toHaveBeenCalledTimes(4);
});
it.each([409, 429, 503])(
  "does not claim removal on DELETE %s and retains explicit retry",
  async (status) => {
    fetcher.mockImplementation(async (url: string, o?: RequestInit) =>
      o?.method === "DELETE"
        ? response(
            { error: { code: "unavailable", message: "PRIVATE STACK" } },
            status,
          )
        : url.endsWith("check-ins")
          ? response({ available: true, checkIns: [checkIn] })
          : response({ available: true, stories: [story()] }),
    );
    await open();
    await screen.findByText("My own caption");
    fireEvent.click(screen.getByRole("button", { name: "Remove story" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
    await screen.findByRole("alert");
    expect(screen.getByText("My own caption")).toBeVisible();
    expect(screen.queryByText("Story removed.")).toBeNull();
    expect(screen.queryByText("PRIVATE STACK")).toBeNull();
  },
);
it("hides private panels and offers sign-in if deletion discovers an expired session", async () => {
  fetcher.mockImplementation(async (url: string, o?: RequestInit) =>
    o?.method === "DELETE"
      ? response({ error: { code: "authentication_required" } }, 401)
      : url.endsWith("check-ins")
        ? response({ available: true, checkIns: [checkIn] })
        : response({ available: true, stories: [story()] }),
  );
  await open();
  await screen.findByText("My own caption");
  fireEvent.click(screen.getByRole("button", { name: "Remove story" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
  await screen.findByRole("link", { name: "Sign in" });
  expect(screen.queryByText("My own caption")).toBeNull();
  expect(screen.queryByRole("combobox")).toBeNull();
});
it("distinguishes private media cleanup pending and retries only that confirmed deletion", async () => {
  let n = 0;
  fetcher.mockImplementation(async (url: string, o?: RequestInit) =>
    o?.method === "DELETE"
      ? response({
          deleted: true,
          mediaCleanup: ++n === 1 ? "pending" : "removed",
        })
      : url.endsWith("check-ins")
        ? response({ available: true, checkIns: [checkIn] })
        : response({ available: true, stories: [story()] }),
  );
  await open();
  await screen.findByText("My own caption");
  fireEvent.click(screen.getByRole("button", { name: "Remove story" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
  const retry = await screen.findByRole("button", {
    name: "Retry media cleanup",
  });
  expect(screen.queryByText("My own caption")).toBeNull();
  expect(screen.queryByText("Story removed.")).toBeNull();
  fireEvent.click(retry);
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Retry media cleanup" }),
    ).toBeNull(),
  );
  expect(n).toBe(2);
});
it.each(["pending", "approved", "rejected"])(
  "renders only actual %s owner status and never client coordinates",
  async (status) => {
    fetcher.mockImplementation(async (url: string) =>
      url.endsWith("check-ins")
        ? response({ available: true, checkIns: [checkIn] })
        : response({
            available: true,
            stories: [
              {
                ...story(status),
                latitude: "SECRET GPS",
                ownerProfile: "SECRET PROFILE",
              },
            ],
          }),
    );
    await open();
    await screen.findByText("My own caption");
    expect(screen.queryByText("SECRET GPS")).toBeNull();
    expect(screen.queryByText("SECRET PROFILE")).toBeNull();
    expect(
      screen.getByText(
        status === "pending"
          ? "Awaiting review"
          : status === "approved"
            ? "Approved"
            : "Not published",
      ),
    ).toBeVisible();
  },
);
it("rejects malformed DTO instead of showing stale or fabricated eligibility", async () => {
  fetcher.mockResolvedValue(
    response({
      available: true,
      checkIns: [{ ...checkIn, id: "invalid" }],
      stories: [{ ...story(), status: "fake" }],
    }),
  );
  render(<CheckinStories locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: "Add story" }));
  await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.queryByText("My own caption")).toBeNull();
});
it("aborts pending reads on close and returns keyboard focus to launcher", async () => {
  fetcher.mockImplementation(() => new Promise(() => {}));
  render(<CheckinStories locale="en" />);
  const launcher = screen.getByRole("button", { name: "Add story" });
  fireEvent.click(launcher);
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(launcher).toHaveFocus();
  expect(fetcher.mock.calls.every(([, o]) => o.signal.aborted)).toBe(true);
});
it("does not remove a row for a successful HTTP response without deleted confirmation", async () => {
  fetcher.mockImplementation(async (url: string, o?: RequestInit) =>
    o?.method === "DELETE"
      ? response({ deleted: false })
      : url.endsWith("check-ins")
        ? response({ available: true, checkIns: [checkIn] })
        : response({ available: true, stories: [story()] }),
  );
  await open();
  await screen.findByText("My own caption");
  fireEvent.click(screen.getByRole("button", { name: "Remove story" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
  await screen.findByRole("alert");
  expect(screen.getByText("My own caption")).toBeVisible();
});

it("does not invent completed media cleanup when the response omits its required status", async () => {
  fetcher.mockImplementation(async (url: string, options?: RequestInit) =>
    options?.method === "DELETE"
      ? response({ deleted: true })
      : url.endsWith("check-ins")
        ? response({ available: true, checkIns: [checkIn] })
        : response({ available: true, stories: [story()] }),
  );
  await open();
  await screen.findByText("My own caption");
  fireEvent.click(screen.getByRole("button", { name: "Remove story" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
  await screen.findByRole("alert");
  expect(screen.getByText("My own caption")).toBeVisible();
  expect(screen.queryByText("Story removed.")).toBeNull();
});

for (const locale of ["en", "es"] as const) {
  it(`${locale} story-ring launcher keeps its native Add story name and opens the same private dialog`, async () => {
    render(<CheckinStories locale={locale} variant="story" />);
    const launcher = screen.getByRole("button", {
      name: locale === "es" ? "Añadir historia" : "Add story",
    });
    expect(launcher).toHaveAttribute("type", "button");
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.click(launcher);
    await screen.findByRole("combobox");
    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "es" ? "Cerrar" : "Close",
      }),
    );
    expect(launcher).toHaveFocus();
  });
}
