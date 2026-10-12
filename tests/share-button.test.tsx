// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const { trackAnalytics } = vi.hoisted(() => ({ trackAnalytics: vi.fn() }));
vi.mock("../src/components/AnalyticsSignal", () => ({ trackAnalytics }));
import { ShareButton } from "../src/components/ShareButton";

const props = {
  title: "AkiPasa event",
  label: "Share",
  copiedLabel: "Link copied",
  venueId: "30000000-0000-4000-8000-000000000002",
  locale: "en" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ShareButton", () => {
  it("preserves the text button and copies the current public URL", async () => {
    render(<ShareButton {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Link copied" })).toBeTruthy();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledExactlyOnceWith(
      window.location.href,
    );
    expect(screen.getByRole("status").textContent).toBe("Link copied");
    expect(trackAnalytics).toHaveBeenCalledExactlyOnceWith({
      action: "share",
      venueId: props.venueId,
      eventId: undefined,
      locale: "en",
    });
  });

  it("keeps icon-only sharing named and uses native sharing when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    render(<ShareButton {...props} iconOnly className="spotlight-share" />);
    const button = screen.getByRole("button", { name: "Share" });
    expect(button.classList.contains("spotlight-share")).toBe(true);
    expect(button.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(button.textContent).toBe("");
    fireEvent.click(button);
    await waitFor(() =>
      expect(share).toHaveBeenCalledExactlyOnceWith({
        title: props.title,
        url: window.location.href,
      }),
    );
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("treats closing the native share sheet as cancellation", async () => {
    const abort = new DOMException("Share dismissed", "AbortError");
    const share = vi.fn().mockRejectedValue(abort);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    render(<ShareButton {...props} iconOnly />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it.each([
    ["en", "Unable to share. Copy the link from your address bar."],
    [
      "es",
      "No se ha podido compartir. Copia el enlace de la barra de direcciones.",
    ],
  ] as const)(
    "announces a real sharing failure in %s and permits retry",
    async (locale, message) => {
      const writeText = vi
        .fn()
        .mockRejectedValueOnce(new Error("Clipboard unavailable"))
        .mockResolvedValueOnce(undefined);
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      });
      render(<ShareButton {...props} locale={locale} iconOnly />);
      fireEvent.click(screen.getByRole("button", { name: "Share" }));
      await waitFor(() =>
        expect(screen.getByRole("status").textContent).toBe(message),
      );
      fireEvent.click(screen.getByRole("button", { name: "Share" }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Link copied" }),
        ).toBeTruthy(),
      );
      expect(screen.getByRole("status").textContent).toBe("Link copied");
      expect(writeText).toHaveBeenCalledTimes(2);
      expect(trackAnalytics).toHaveBeenCalledTimes(2);
    },
  );
});
