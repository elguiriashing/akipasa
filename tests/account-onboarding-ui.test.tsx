// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({ status: "pending" }));
vi.mock("@/lib/auth", () => ({
  requireIdentity: async () => ({ supabase: {} }),
}));
vi.mock("@/lib/account-onboarding-server", () => ({
  readOnboardingStatus: async () => state.status,
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("404");
  },
  redirect: (path: string) => {
    throw new Error(path);
  },
}));
vi.mock("@/app/[locale]/onboarding/actions", () => ({
  completeAccount: vi.fn(),
  requestRestrictedDeletion: vi.fn(),
}));
vi.mock("@/app/[locale]/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/components/PersonalisationSettings", () => ({
  PersonalisationSettings: () => <div>Privacy controls</div>,
}));
import RestrictedPrivacy from "../src/app/[locale]/onboarding/privacy/page";
import OnboardingPage from "../src/app/[locale]/onboarding/page";
import { ConsentAnalytics } from "../src/components/ConsentAnalytics";
afterEach(() => {
  cleanup();
  state.status = "pending";
  for (const c of document.cookie.split("; "))
    document.cookie = c.split("=")[0] + "=; Max-Age=0; Path=/";
  document.getElementById("ak-consented-ga")?.remove();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it.each(["en", "es"] as const)(
  "renders minimal labelled %s completion and safe rights paths",
  async (locale) => {
    const tree = await OnboardingPage({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve({
        next: `/${locale}/account/subscription`,
      }),
    });
    render(tree);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(
      screen.getByLabelText(locale === "es" ? "Nombre de usuario" : "Username"),
    ).toHaveAttribute("name", "username");
    expect(
      screen.getByLabelText(
        locale === "es" ? "Foto (opcional)" : "Photo (optional)",
        { exact: false },
      ),
    ).toHaveAttribute("type", "file");
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(
      document.querySelector('[name="birthdate"],[name="birthYear"]'),
    ).toBeNull();
    expect(
      document.querySelector(`a[href="/${locale}/onboarding/privacy"]`),
    ).not.toBeNull();
  },
);
it("removes retry controls for a persisted negative declaration", async () => {
  state.status = "underage";
  render(
    await OnboardingPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    }),
  );
  expect(screen.queryByRole("radio")).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Save and continue" }),
  ).toBeNull();
  expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
});
it("keeps all Google consent signals denied for restricted accounts despite cookies", () => {
  document.cookie = "ak_analytics=granted; Path=/";
  document.cookie = "ak_marketing=granted; Path=/";
  const gtag = vi.fn();
  Object.assign(window, { gtag, dataLayer: [] });
  render(<ConsentAnalytics trackingAllowed={false} />);
  expect(gtag).toHaveBeenCalledWith("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  expect(document.getElementById("ak-consented-ga")).toBeNull();
});

it("keeps award/address privacy reachable outside the locked account layout", async () => {
  vi.stubEnv("AKIPASA_PRESTIGE_SCHEMA_READY", "true");
  render(
    await RestrictedPrivacy({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    }),
  );
  expect(
    screen.getByRole("link", { name: "Award and shipping privacy" }),
  ).toHaveAttribute("href", "/en/privacy/prestige");
  expect(screen.getByRole("link", { name: "Export my data" })).toHaveAttribute(
    "href",
    "/en/account/export",
  );
  expect(
    screen.getByRole("button", { name: "Request deletion" }),
  ).toBeInTheDocument();
});

it.each(["en", "es"] as const)(
  "retains restricted %s privacy and explicit request-only deletion wording",
  async (locale) => {
    render(
      await RestrictedPrivacy({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: locale === "es" ? "Eliminar cuenta" : "Delete account",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        locale === "es"
          ? "Esto envía una solicitud de eliminación. Tu cuenta no se borra inmediatamente."
          : "This submits a deletion request. Your account is not erased immediately.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        locale === "es"
          ? "Escribe DELETE para solicitar la eliminación"
          : "Type DELETE to request deletion",
      ),
    ).toHaveAttribute("required");
    expect(
      screen.getByRole("link", {
        name: locale === "es" ? "Exportar mis datos" : "Export my data",
      }),
    ).toHaveAttribute("href", `/${locale}/account/export`);
  },
);
it.each(["en", "es"] as const)(
  "renders a request receipt without another %s deletion form",
  async (locale) => {
    render(
      await RestrictedPrivacy({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({ requested: "1" }),
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      locale === "es"
        ? "Solicitud de eliminación registrada."
        : "Deletion request registered.",
    );
    expect(
      screen.queryByRole("button", {
        name: locale === "es" ? "Solicitar eliminación" : "Request deletion",
      }),
    ).not.toBeInTheDocument();
  },
);
