// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
const review = vi.hoisted(() => vi.fn());
vi.mock("../src/app/[locale]/admin/accommodation-review/actions", () => ({
  reviewNativeAccommodation: review,
}));
import { NativeAccommodationReviewForm } from "../src/components/NativeAccommodationReviewForm";
const property = "95000000-0000-4000-8000-000000000001",
  revision = "95000000-0000-4000-8000-000000000002";
beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());
it.each(["en", "es"] as const)(
  "retains %s review reason after a stale or unavailable revision",
  async (locale) => {
    review.mockResolvedValue({ ok: false, error: "stale" });
    render(
      <NativeAccommodationReviewForm
        property={property}
        revision={revision}
        locale={locale}
      />,
    );
    const input = screen.getByLabelText(
      locale === "es" ? "Motivo de la revisión" : "Review reason",
    );
    fireEvent.change(input, {
      target: { value: "Detailed verified review reason" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "es" ? "Aprobar publicación" : "Approve publication",
      }),
    );
    await screen.findByRole("alert");
    expect((input as HTMLTextAreaElement).value).toBe(
      "Detailed verified review reason",
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(review).toHaveBeenCalledWith({
      property,
      revision,
      locale,
      publish: true,
      reason: "Detailed verified review reason",
    });
  },
);
it.each(["en", "es"] as const)(
  "confirms a %s decision only after success and prevents duplicate review",
  async (locale) => {
    review.mockResolvedValue({ ok: true });
    render(
      <NativeAccommodationReviewForm
        property={property}
        revision={revision}
        locale={locale}
      />,
    );
    const input = screen.getByLabelText(
      locale === "es" ? "Motivo de la revisión" : "Review reason",
    );
    fireEvent.change(input, {
      target: { value: "Detailed reason for rejection" },
    });
    const button = screen.getByRole("button", {
      name: locale === "es" ? "Rechazar publicación" : "Reject publication",
    });
    fireEvent.click(button);
    await screen.findByText(
      locale === "es" ? "Revisión registrada." : "Review recorded.",
    );
    await waitFor(() =>
      expect((button.closest("fieldset") as HTMLFieldSetElement).disabled).toBe(
        true,
      ),
    );
    expect(review).toHaveBeenCalledTimes(1);
    expect(review.mock.calls[0][0].publish).toBe(false);
  },
);
it.each(["en", "es"] as const)(
  "disables the %s decision while pending without claiming success",
  async (locale) => {
    let resolveReview!: (value: { ok: boolean; error?: string }) => void;
    review.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveReview = resolve;
        }),
    );
    render(
      <NativeAccommodationReviewForm
        property={property}
        revision={revision}
        locale={locale}
      />,
    );
    const input = screen.getByLabelText(
      locale === "es" ? "Motivo de la revisión" : "Review reason",
    );
    const approve = screen.getByRole("button", {
      name: locale === "es" ? "Aprobar publicación" : "Approve publication",
    });
    expect((approve as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, {
      target: { value: "Verified pending review reason" },
    });
    fireEvent.click(approve);
    expect(screen.getByRole("status").textContent).toContain(
      locale === "es" ? "Registrando" : "Recording",
    );
    expect((approve.closest("fieldset") as HTMLFieldSetElement).disabled).toBe(
      true,
    );
    expect(
      screen.queryByText(
        locale === "es" ? "Revisión registrada." : "Review recorded.",
      ),
    ).toBeNull();
    resolveReview({ ok: false, error: "unavailable" });
    await screen.findByRole("alert");
    expect((input as HTMLTextAreaElement).value).toBe(
      "Verified pending review reason",
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect((approve.closest("fieldset") as HTMLFieldSetElement).disabled).toBe(
      false,
    );
  },
);
