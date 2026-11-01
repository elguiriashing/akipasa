// @vitest-environment jsdom
// Synthetic HTTP DTOs only: not real staff Auth/RLS, private Storage or live decisions.
import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  StoryModeration,
  type ModerationStory,
} from "../src/components/community/StoryModeration";

// Next Image performs async browser decoding unavailable in jsdom. Native load/error
// adapter tests our state machine; the browser runner uses the actual Next Image.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const native = { ...props };
    delete native.unoptimized;
    return createElement("img", { ...native, alt: String(props.alt || "") });
  },
}));

const id = "00000000-0000-4000-8000-000000000041";
const story: ModerationStory = {
  id,
  citySlug: "malaga",
  venueName: "Disposable venue",
  caption: "Synthetic submitted moment",
  kind: "venue",
  status: "pending",
  createdAt: "2026-10-31T12:00:00Z",
  expiresAt: "2026-11-01T12:00:00Z",
  mediaUrl: `/api/community/stories/${id}/media`,
  reportCount: 0,
};
const fetcher = vi.fn();
const response = (stories: ModerationStory[] = [story]) => ({
  ok: true,
  status: 200,
  json: async () => ({ available: true, stories }),
});
beforeEach(() => {
  fetcher.mockReset();
  fetcher.mockResolvedValue(response());
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function ready(locale: "en" | "es" = "en") {
  render(<StoryModeration locale={locale} />);
  await screen.findByRole("heading", { name: story.venueName });
  const image = screen.queryByRole("img");
  if (image) fireEvent.load(image);
}
function reason(text = "Reviewed against content policy") {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
}

it("loads only the authorized same-origin queue and never decides on render", async () => {
  await ready();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/community/stories/moderation?queue=pending",
    expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
  );
  expect(screen.getByRole("img")).toHaveAttribute("src", story.mediaUrl);
  expect(screen.getByText("Not published")).toBeInTheDocument();
  expect(
    screen.queryByText(/owner@|latitude|longitude/i),
  ).not.toBeInTheDocument();
});
it("requires a bounded reason and focuses it without any POST", async () => {
  await ready();
  fireEvent.click(screen.getByRole("button", { name: "Approve publication" }));
  expect(screen.getByRole("alert")).toHaveTextContent("3 and 240");
  expect(screen.getByRole("textbox")).toHaveFocus();
  reason("x".repeat(241));
  fireEvent.click(screen.getByRole("button", { name: "Reject story" }));
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each([
  ["Approve publication", "approve"],
  ["Reject story", "reject"],
])(
  "submits an explicit %s decision, then reloads authoritative results",
  async (label, decision) => {
    await ready();
    reason();
    fetcher
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce(response([]));
    fireEvent.click(screen.getByRole("button", { name: label }));
    await screen.findByRole("heading", { name: "No stories awaiting review" });
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      `/api/community/stories/${id}/moderate`,
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason: "Reviewed against content policy",
        }),
      }),
    );
    expect(fetcher).toHaveBeenCalledTimes(3);
  },
);
it("keeps reason and record on failed decisions without claiming success", async () => {
  await ready();
  reason();
  fetcher.mockResolvedValueOnce({ ok: false, status: 503 });
  fireEvent.click(screen.getByRole("button", { name: "Reject story" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "could not be confirmed",
  );
  expect(screen.getByRole("textbox")).toHaveValue(
    "Reviewed against content policy",
  );
  expect(screen.queryByText(/Decision recorded/)).not.toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: story.venueName }),
  ).toBeInTheDocument();
});
it("clears private previews when authorization is lost during a decision", async () => {
  await ready();
  reason();
  fetcher.mockResolvedValueOnce({ ok: false, status: 403 });
  fireEvent.click(screen.getByRole("button", { name: "Approve publication" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "authorized staff session",
  );
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
it("shows actual reported queue and explicit takedown without publication buttons", async () => {
  await ready();
  fetcher.mockResolvedValueOnce(
    response([{ ...story, status: "approved", reportCount: 2 }]),
  );
  fireEvent.click(screen.getByRole("button", { name: "Reports and takedown" }));
  await screen.findByRole("button", { name: "Take down story" });
  expect(screen.getByText("Reports received: 2")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Approve publication" }),
  ).not.toBeInTheDocument();
  reason("Reported content requires removal");
  fetcher
    .mockResolvedValueOnce({ ok: true, status: 200 })
    .mockResolvedValueOnce(response([]));
  fireEvent.click(screen.getByRole("button", { name: "Take down story" }));
  await screen.findByRole("heading", { name: "No reports awaiting review" });
  expect(fetcher).toHaveBeenCalledWith(
    `/api/community/stories/${id}/moderate`,
    expect.objectContaining({
      body: JSON.stringify({
        decision: "remove",
        reason: "Reported content requires removal",
      }),
    }),
  );
});
it("offers retry on queue failure and never calls a failure an empty queue", async () => {
  fetcher.mockResolvedValueOnce({ ok: false, status: 503 });
  render(<StoryModeration locale="en" />);
  await screen.findByRole("button", { name: "Retry" });
  expect(
    screen.queryByText("No stories awaiting review"),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByRole("heading", { name: story.venueName });
  const image = screen.queryByRole("img");
  if (image) fireEvent.load(image);
});
it("rejects malformed queue DTOs instead of rendering partial content", async () => {
  fetcher.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      available: true,
      stories: [{ ...story, id: "../../private" }],
    }),
  });
  render(<StoryModeration locale="en" />);
  await screen.findByRole("button", { name: "Retry" });
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
it("never loads arbitrary media URLs and explains failed authorized previews", async () => {
  fetcher.mockResolvedValueOnce(
    response([
      { ...story, mediaUrl: "https://private.example/object?secret=not-real" },
    ]),
  );
  await ready();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
});
it("provides a truthful fallback if the private preview expires", async () => {
  await ready();
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
it("disables duplicate decisions and queue switching while a decision is pending", async () => {
  await ready();
  reason();
  let finish!: (value: unknown) => void;
  fetcher.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Approve publication" }));
  expect(
    screen.getByRole("button", { name: "Reports and takedown" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Reject story" }));
  expect(fetcher).toHaveBeenCalledTimes(2);
  fetcher.mockResolvedValueOnce(response([]));
  finish({ ok: true, status: 200 });
  await screen.findByRole("heading", { name: "No stories awaiting review" });
});
it("ignores a late response from an abandoned queue", async () => {
  let finish!: (value: unknown) => void;
  fetcher
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce(response([]));
  render(<StoryModeration locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: "Reports and takedown" }));
  await screen.findByRole("heading", { name: "No reports awaiting review" });
  finish(response());
  await waitFor(() =>
    expect(screen.queryByRole("img")).not.toBeInTheDocument(),
  );
});
it("localizes staff restriction and never leaks backend messages", async () => {
  fetcher.mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: async () => ({ error: "owner@example.com" }),
  });
  render(<StoryModeration locale="es" />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "personal autorizado",
  );
  expect(screen.queryByText(/owner@example/)).not.toBeInTheDocument();
});

it("requires a successfully loaded private preview before approval", async () => {
  render(<StoryModeration locale="en" />);
  await screen.findByRole("img");
  expect(
    screen.getByRole("button", { name: "Approve publication" }),
  ).toBeDisabled();
  fireEvent.load(screen.getByRole("img"));
  expect(
    screen.getByRole("button", { name: "Approve publication" }),
  ).toBeEnabled();
  fireEvent.error(screen.getByRole("img"));
  expect(
    screen.getByRole("button", { name: "Approve publication" }),
  ).toBeDisabled();
});
