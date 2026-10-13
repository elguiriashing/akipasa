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
import { readMotionPreference } from "../src/lib/passport-motion";
const navigation = vi.hoisted(() => ({ pathname: "/en", search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));
afterEach(() => {
  navigation.pathname = "/en";
  navigation.search = "";
  cleanup();
  for (const c of document.cookie.split("; "))
    document.cookie = c.split("=")[0] + "=; Max-Age=0; Path=/";
  document.getElementById("ak-consented-ga")?.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it.each(["en", "es"] as const)(
  "dismisses a first-visit %s panel without applying optional consent or losing the draft",
  async (locale) => {
    navigation.pathname = `/${locale}`;
    localStorage.removeItem("akipasa:passport-motion");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("React", React);
    const es = locale === "es";
    render(
      <>
        <ConsentAnalytics />
        <PersonalisationConsent locale={locale} />
      </>,
    );
    const name = es ? "Opciones de privacidad" : "Privacy choices";
    const trigger = screen.getByRole("button", { name });
    const panel = await screen.findByRole("complementary", { name });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", panel.id);
    for (const input of panel.querySelectorAll("input"))
      expect(input).not.toBeChecked();
    fireEvent.click(
      screen.getByLabelText(
        es
          ? "Recomendaciones según mis interacciones"
          : "Recommendations based on my interactions",
      ),
    );
    fireEvent.click(
      screen.getByLabelText(
        es
          ? "Inclinación del pasaporte con el movimiento del móvil"
          : "Passport tilt using phone motion",
      ),
    );
    const cookies = document.cookie;
    fireEvent.click(
      screen.getByRole("button", {
        name: es ? "Cerrar opciones de privacidad" : "Close privacy choices",
      }),
    );
    expect(screen.queryByRole("complementary", { name })).toBeNull();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.cookie).toBe(cookies);
    expect(document.cookie).not.toContain("ak_consent_version");
    expect(readPrivacyChoices()).toEqual({
      analytics: false,
      personalisation: false,
      marketing: false,
    });
    expect(readMotionPreference()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.getElementById("ak-consented-ga")).toBeNull();
    expect(document.getElementById("ak-google-ads-loader")).toBeNull();
    fireEvent.click(trigger);
    expect(
      screen.getByLabelText(
        es
          ? "Recomendaciones según mis interacciones"
          : "Recommendations based on my interactions",
      ),
    ).toBeChecked();
    expect(
      screen.getByLabelText(
        es
          ? "Inclinación del pasaporte con el movimiento del móvil"
          : "Passport tilt using phone motion",
      ),
    ).toBeChecked();
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
it("closes with Escape from a panel control and leaves saved permissions unchanged", async () => {
  const saved = { analytics: false, personalisation: true, marketing: false };
  writePrivacyChoices(saved);
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(<PersonalisationConsent locale="en" />);
  const trigger = screen.getByRole("button", { name: "Privacy choices" });
  fireEvent.click(trigger);
  const input = screen.getByLabelText("Advertising personalisation");
  fireEvent.click(input);
  input.focus();
  const cookies = document.cookie;
  fireEvent.keyDown(input, { key: "Escape" });
  expect(
    screen.queryByRole("complementary", { name: "Privacy choices" }),
  ).toBeNull();
  expect(trigger).toHaveFocus();
  expect(document.cookie).toBe(cookies);
  expect(readPrivacyChoices()).toEqual(saved);
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(trigger);
  expect(screen.getByLabelText("Advertising personalisation")).toBeChecked();
  expect(
    screen.getByLabelText("Recommendations based on my interactions"),
  ).toBeChecked();
});
it("keeps the panel visible while an explicit save is pending", async () => {
  let resolveResponse: (response: Response) => void = () => {};
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    ),
  );
  render(<PersonalisationConsent locale="en" />);
  const panel = await screen.findByRole("complementary", {
    name: "Privacy choices",
  });
  fireEvent.click(screen.getByRole("button", { name: "Save choices" }));
  expect(
    screen.getByRole("button", { name: "Close privacy choices" }),
  ).toBeDisabled();
  fireEvent.keyDown(panel, { key: "Escape" });
  expect(panel).toBeVisible();
  resolveResponse(new Response(null, { status: 204 }));
  await waitFor(() => expect(panel).not.toBeInTheDocument());
});
it("follows route language changes without resetting or submitting privacy choices", async () => {
  navigation.pathname = "/es/venues/test-venue";
  document.cookie = "ak_consent_version=2; Path=/";
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { rerender } = render(<PersonalisationConsent locale="es" />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Opciones de privacidad" }),
  );
  fireEvent.click(
    screen.getByLabelText("Recomendaciones según mis interacciones"),
  );
  fireEvent.click(
    screen.getByLabelText(
      "Inclinación del pasaporte con el movimiento del móvil",
    ),
  );

  navigation.pathname = "/en/venues/test-venue";
  rerender(<PersonalisationConsent locale="es" />);
  expect(screen.getByRole("button", { name: "Privacy choices" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Save choices" })).toBeVisible();
  expect(
    screen.getByLabelText("Recommendations based on my interactions"),
  ).toBeChecked();
  expect(
    screen.getByLabelText("Passport tilt using phone motion"),
  ).toBeChecked();
  expect(
    screen.getByLabelText("Audience measurement (Google Analytics)"),
  ).not.toBeChecked();

  navigation.pathname = "/es/map";
  rerender(<PersonalisationConsent locale="es" />);
  expect(
    screen.getByRole("button", { name: "Opciones de privacidad" }),
  ).toBeVisible();
  expect(
    screen.getByLabelText("Recomendaciones según mis interacciones"),
  ).toBeChecked();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(readPrivacyChoices()).toEqual({
    analytics: false,
    personalisation: false,
    marketing: false,
  });
  expect(document.cookie).toContain("ak_consent_version=2");
});
it.each(["/pals", "/akiduermo/saved", "/enough", "/escape"])(
  "retains the server locale on the non-localized route %s",
  async (pathname) => {
    navigation.pathname = pathname;
    document.cookie = "ak_consent_version=2; Path=/";
    const { rerender } = render(<PersonalisationConsent locale="es" />);
    expect(
      await screen.findByRole("button", { name: "Opciones de privacidad" }),
    ).toBeVisible();
    rerender(<PersonalisationConsent locale="en" />);
    expect(
      screen.getByRole("button", { name: "Privacy choices" }),
    ).toBeVisible();
  },
);
it("follows AkiDuermo query language changes without resetting or submitting choices", async () => {
  navigation.pathname = "/akiduermo";
  navigation.search = "lang=es";
  document.cookie = "ak_consent_version=2; Path=/";
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { rerender } = render(<PersonalisationConsent locale="es" />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Opciones de privacidad" }),
  );
  fireEvent.click(
    screen.getByLabelText("Recomendaciones según mis interacciones"),
  );

  navigation.search = "lang=en";
  rerender(<PersonalisationConsent locale="es" />);
  expect(screen.getByRole("button", { name: "Privacy choices" })).toBeVisible();
  expect(
    screen.getByLabelText("Recommendations based on my interactions"),
  ).toBeChecked();
  navigation.search = "lang=es";
  rerender(<PersonalisationConsent locale="es" />);
  expect(
    screen.getByLabelText("Recomendaciones según mis interacciones"),
  ).toBeChecked();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(readPrivacyChoices()).toEqual({
    analytics: false,
    personalisation: false,
    marketing: false,
  });
  expect(document.cookie).toContain("ak_consent_version=2");
});
it("follows bounded stay locale events with stale Next queries and preserves draft choices", async () => {
  navigation.pathname = "/akiduermo";
  navigation.search = "lang=es";
  document.cookie = "ak_consent_version=2; Path=/";
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const removeListener = vi.spyOn(window, "removeEventListener");
  const { rerender, unmount } = render(<PersonalisationConsent locale="es" />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Opciones de privacidad" }),
  );
  fireEvent.click(
    screen.getByLabelText("Recomendaciones según mis interacciones"),
  );
  fireEvent.click(
    screen.getByLabelText(
      "Inclinación del pasaporte con el movimiento del móvil",
    ),
  );
  fireEvent(window, new CustomEvent("akipasa:locale-change", { detail: "en" }));
  expect(screen.getByRole("button", { name: "Privacy choices" })).toBeVisible();
  expect(
    screen.getByLabelText("Recommendations based on my interactions"),
  ).toBeChecked();
  expect(
    screen.getByLabelText("Passport tilt using phone motion"),
  ).toBeChecked();
  for (const detail of ["fr", { locale: "es" }, null])
    fireEvent(window, new CustomEvent("akipasa:locale-change", { detail }));
  expect(screen.getByRole("button", { name: "Privacy choices" })).toBeVisible();

  navigation.pathname = "/akiduermo/saved";
  rerender(<PersonalisationConsent locale="es" />);
  expect(
    screen.getByRole("button", { name: "Opciones de privacidad" }),
  ).toBeVisible();
  expect(
    screen.getByLabelText("Recomendaciones según mis interacciones"),
  ).toBeChecked();
  navigation.pathname = "/akiduermo";
  rerender(<PersonalisationConsent locale="es" />);
  expect(
    screen.getByRole("button", { name: "Opciones de privacidad" }),
  ).toBeVisible();
  expect(
    screen.getByLabelText("Recomendaciones según mis interacciones"),
  ).toBeChecked();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(readPrivacyChoices()).toEqual({
    analytics: false,
    personalisation: false,
    marketing: false,
  });
  expect(document.cookie).toContain("ak_consent_version=2");
  unmount();
  expect(removeListener).toHaveBeenCalledWith(
    "akipasa:locale-change",
    expect.any(Function),
  );
  removeListener.mockRestore();
});
it.each([
  ["/es/membership", "en", "Opciones de privacidad"],
  ["/en/membership", "es", "Privacy choices"],
])(
  "keeps the exact path language authoritative over a locale event: %s",
  async (pathname, detail, label) => {
    navigation.pathname = pathname;
    document.cookie = "ak_consent_version=2; Path=/";
    render(<PersonalisationConsent locale="es" />);
    fireEvent(window, new CustomEvent("akipasa:locale-change", { detail }));
    expect(await screen.findByRole("button", { name: label })).toBeVisible();
  },
);
it.each([
  ["/es/membership", "lang=en", "Opciones de privacidad"],
  ["/en/membership", "lang=es", "Privacy choices"],
  ["/akiduermo", "lang=es-ES", "Privacy choices"],
  ["/akiduermo", "lang=", "Privacy choices"],
])(
  "uses a valid localized path before query values and rejects malformed fallback: %s?%s",
  async (pathname, search, label) => {
    navigation.pathname = pathname;
    navigation.search = search;
    document.cookie = "ak_consent_version=2; Path=/";
    render(<PersonalisationConsent locale="en" />);
    expect(await screen.findByRole("button", { name: label })).toBeVisible();
  },
);
it("does not request Google tags while optional consent is denied", async () => {
  vi.stubGlobal("React", React);
  render(<ConsentAnalytics />);
  await waitFor(() =>
    expect(
      (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag,
    ).toBeDefined(),
  );
  expect(document.getElementById("ak-consented-ga")).toBeNull();
  expect(document.getElementById("ak-google-ads-loader")).toBeNull();
  writePrivacyChoices({
    analytics: false,
    personalisation: false,
    marketing: false,
  });
  expect(document.getElementById("ak-consented-ga")).toBeNull();
});

it("keeps one working privacy trigger in the Passport rail and restores it after leaving", async () => {
  navigation.pathname = "/en/passports";
  document.cookie = "ak_consent_version=2; Path=/";
  const { rerender } = render(
    <>
      <nav aria-label="Passport chapters">
        <div id="passport-privacy-controls" />
      </nav>
      <PersonalisationConsent locale="en" />
    </>,
  );
  const trigger = await screen.findByRole("button", {
    name: "Privacy choices",
  });
  expect(trigger.closest("#passport-privacy-controls")).not.toBeNull();
  expect(
    screen.getAllByRole("button", { name: "Privacy choices" }),
  ).toHaveLength(1);
  fireEvent.click(trigger);
  expect(
    await screen.findByRole("button", { name: "Save choices" }),
  ).toBeVisible();

  navigation.pathname = "/en";
  rerender(<PersonalisationConsent locale="en" />);
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Privacy choices" })
        .closest("#passport-privacy-controls"),
    ).toBeNull(),
  );
  expect(
    screen.getAllByRole("button", { name: "Privacy choices" }),
  ).toHaveLength(1);
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
