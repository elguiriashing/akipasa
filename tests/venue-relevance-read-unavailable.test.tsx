// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { VenueRelevanceReview } from "../src/components/VenueRelevanceReview";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const proposal = {
  id: "fixture-venue",
  name: "Read recovery venue",
  address: "Fixture street",
  slug: "read-recovery-venue",
  action: "KEEP",
  relevance_class: "local",
  confidence: 0.9,
  reason: "Disposable component fixture only",
  fingerprint: "fixture-fingerprint",
  stale: false,
};
const reply = (ok: boolean, body: unknown) =>
  Promise.resolve({ ok, json: async () => body });

it.each(["en", "es"] as const)(
  "%s distinguishes an unavailable read from an empty queue and recovers through GET Retry",
  async (locale) => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => reply(false, { error: "Read unavailable" }))
      .mockImplementationOnce(() =>
        reply(true, { rows: [proposal], total: 1 }),
      );
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<VenueRelevanceReview locale={locale} />);
    const retryName = locale === "es" ? "Reintentar" : "Retry";
    await screen.findByRole("button", { name: retryName });
    expect(
      container.querySelector(".admin-relevance-count strong"),
    ).toHaveTextContent("—");
    expect(
      container.querySelector(".admin-relevance-pagination small"),
    ).toHaveTextContent("—");
    expect(
      screen.queryByText(/No proposals match|No hay propuestas con/),
    ).not.toBeInTheDocument();
    expect(container.querySelector("form")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: retryName }));
    await screen.findByRole("link", { name: proposal.name });
    expect(
      container.querySelector(".admin-relevance-count strong"),
    ).toHaveTextContent("1");
    expect(
      screen.queryByRole("button", { name: retryName }),
    ).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [url, options] of fetch.mock.calls) {
      expect(url).toBe("/api/admin/venue-relevance?q=&action=&offset=0");
      expect(options?.method).toBeUndefined();
    }
  },
);

it("withholds stale proposals after a failed refresh until a successful read", async () => {
  const fetch = vi
    .fn()
    .mockImplementationOnce(() => reply(true, { rows: [proposal], total: 1 }))
    .mockRejectedValueOnce(new Error("Temporary offline failure"))
    .mockImplementationOnce(() => reply(true, { rows: [proposal], total: 1 }));
  vi.stubGlobal("fetch", fetch);
  const { container } = render(<VenueRelevanceReview locale="en" />);
  await screen.findByRole("link", { name: proposal.name });
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await screen.findByRole("button", { name: "Retry" });
  expect(
    screen.queryByRole("link", { name: proposal.name }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Save decision" }),
  ).not.toBeInTheDocument();
  expect(
    container.querySelector(".admin-relevance-count strong"),
  ).toHaveTextContent("—");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByRole("button", { name: "Save decision" });
  expect(fetch.mock.calls.every(([, options]) => !options?.method)).toBe(true);
});

it.each(["en", "es"] as const)(
  "%s preserves a genuine healthy empty queue",
  async (locale) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => reply(true, { rows: [], total: 0 })),
    );
    const { container } = render(<VenueRelevanceReview locale={locale} />);
    await screen.findByText(
      locale === "es"
        ? "No hay propuestas con estos filtros."
        : "No proposals match these filters.",
    );
    expect(
      container.querySelector(".admin-relevance-count strong"),
    ).toHaveTextContent("0");
    expect(
      container.querySelector(".admin-relevance-pagination small"),
    ).toHaveTextContent("0 / 0");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^(Retry|Reintentar)$/ }),
    ).not.toBeInTheDocument();
  },
);

it("preserves the populated form and audited reason after a POST validation rejection", async () => {
  const fetch = vi
    .fn()
    .mockImplementationOnce(() => reply(true, { rows: [proposal], total: 1 }))
    .mockImplementationOnce(() =>
      reply(false, { error: "Decision validation rejected" }),
    );
  vi.stubGlobal("fetch", fetch);
  const { container } = render(<VenueRelevanceReview locale="en" />);
  await screen.findByRole("button", { name: "Save decision" });
  const reason = screen.getByRole("textbox", { name: "Audited reason" });
  fireEvent.change(reason, {
    target: { value: "Keep this legitimate local listing" },
  });
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Decision validation rejected",
    ),
  );
  expect(reason).toHaveValue("Keep this legitimate local listing");
  expect(screen.getByRole("button", { name: "Save decision" })).toBeEnabled();
  expect(
    container.querySelector(".admin-relevance-count strong"),
  ).toHaveTextContent("1");
  expect(
    screen.queryByRole("button", { name: "Retry" }),
  ).not.toBeInTheDocument();
  expect(fetch.mock.calls[1][1]).toMatchObject({
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
    venueId: proposal.id,
    fingerprint: proposal.fingerprint,
    action: "KEEP",
    weight: 0.5,
    reason: "Keep this legitimate local listing",
  });
});
