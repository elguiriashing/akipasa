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
import { ContributionDraftForm } from "@/components/community/ContributionDraftForm";
import { SpainAddressAutocomplete } from "@/components/SpainAddressAutocomplete";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

const action = vi.fn(async () => undefined);

it("retains a failed contribution draft in the current browser tab", async () => {
  const { unmount } = render(
    <ContributionDraftForm
      action={action}
      draftKey="suggest-draft"
      recover={false}
      locale="en"
    >
      <input name="title" defaultValue="Local event" />
      <textarea name="description" defaultValue="Useful details" />
    </ContributionDraftForm>,
  );
  fireEvent.submit(document.querySelector("form")!);
  expect(JSON.parse(sessionStorage.getItem("suggest-draft") || "{}")).toEqual({
    title: "Local event",
    description: "Useful details",
  });

  unmount();
  render(
    <ContributionDraftForm
      action={action}
      draftKey="suggest-draft"
      recover
      locale="en"
    >
      <input name="title" />
      <textarea name="description" />
    </ContributionDraftForm>,
  );

  expect(await screen.findByRole("status")).toHaveTextContent(
    "restored the details",
  );
  expect(document.querySelector('input[name="title"]')).toHaveValue(
    "Local event",
  );
  expect(document.querySelector("textarea")).toHaveValue("Useful details");
});

it("restores a selected precise address and its validated coordinates", async () => {
  sessionStorage.setItem(
    "address-draft",
    JSON.stringify({
      venueAddress: "Calle Mayor 1, Madrid",
      addressProviderId: "cartociudad-1",
      locality: "Madrid",
      province: "Madrid",
      postalCode: "28013",
      latitude: "40.4168",
      longitude: "-3.7038",
    }),
  );
  render(
    <ContributionDraftForm
      action={action}
      draftKey="address-draft"
      recover
      locale="en"
    >
      <SpainAddressAutocomplete
        locale="en"
        mode="address"
        name="venueAddress"
        label="Address"
      />
    </ContributionDraftForm>,
  );

  await waitFor(() =>
    expect(screen.getByRole("combobox", { name: "Address" })).toHaveValue(
      "Calle Mayor 1, Madrid",
    ),
  );
  expect(document.querySelector('[name="addressSelection"]')).toHaveValue(
    "selected",
  );
  expect(document.querySelector('[name="latitude"]')).toHaveValue("40.4168");
  expect(document.querySelector('[name="longitude"]')).toHaveValue("-3.7038");
});

it("clears a stale draft when the form was opened without a failure return", () => {
  sessionStorage.setItem("report-draft", JSON.stringify({ details: "stale" }));
  render(
    <ContributionDraftForm
      action={action}
      draftKey="report-draft"
      recover={false}
      locale="en"
    >
      <textarea name="details" />
    </ContributionDraftForm>,
  );
  expect(sessionStorage.getItem("report-draft")).toBeNull();
  expect(document.querySelector("textarea")).toHaveValue("");
});
