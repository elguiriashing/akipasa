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
import { PersonalisationConsent } from "../src/components/PersonalisationConsent";
import { ConsentAnalytics } from "../src/components/ConsentAnalytics";
import {
  readPrivacyChoices,
  writePrivacyChoices,
} from "../src/lib/privacy-consent";
afterEach(() => {
  cleanup();
  for (const c of document.cookie.split("; "))
    document.cookie = c.split("=")[0] + "=; Max-Age=0; Path=/";
  document.getElementById("ak-consented-ga")?.remove();
  vi.unstubAllGlobals();
});
it("does not load Google analytics until measurement is explicitly selected", async () => {
  vi.stubGlobal("React", React);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 204 })),
  );
  render(
    <>
      <ConsentAnalytics />
      <PersonalisationConsent locale="en" />
    </>,
  );
  expect(document.getElementById("ak-consented-ga")).toBeNull();
  fireEvent.click(
    await screen.findByLabelText("Recommendations based on my interactions"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save choices" }));
  await waitFor(() => expect(readPrivacyChoices().personalisation).toBe(true));
  expect(readPrivacyChoices().analytics).toBe(false);
  expect(document.getElementById("ak-consented-ga")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }));
  fireEvent.click(
    screen.getByLabelText("Audience measurement (Google Analytics)"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save choices" }));
  await waitFor(() =>
    expect(document.getElementById("ak-consented-ga")).not.toBeNull(),
  );
  expect(readPrivacyChoices().marketing).toBe(false);
  writePrivacyChoices({
    analytics: false,
    personalisation: false,
    marketing: false,
  });
  expect(
    (window as unknown as Record<string, unknown>)["ga-disable-G-PW8547QDGD"],
  ).toBe(true);
});
it("withdraws locally and shows a retry error when saving fails", async () => {
  vi.stubGlobal("React", React);
  writePrivacyChoices({
    analytics: true,
    personalisation: true,
    marketing: false,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(null, { status: 503 })),
  );
  render(<PersonalisationConsent locale="en" />);
  fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }));
  fireEvent.click(screen.getByRole("button", { name: "Reject optional" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
  expect(readPrivacyChoices()).toEqual({
    analytics: false,
    personalisation: false,
    marketing: false,
  });
});
