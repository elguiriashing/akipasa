// @vitest-environment jsdom

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

const account = vi.hoisted(() => ({
  tables: {} as Record<string, unknown>,
  errors: {} as Record<string, unknown>,
  refresh: vi.fn(),
  user: { id: "account-controls-fixture", email: "member@example.test" },
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: account.refresh }),
}));

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(async () => ({
    user: account.user,
    supabase: {
      from: (table: string) => {
        const query = {
          select: () => query,
          eq: () => query,
          in: () => query,
          maybeSingle: async () => ({
            data: account.errors[table]
              ? null
              : (account.tables[table] ?? null),
            error: account.errors[table] ?? null,
          }),
          then: (
            resolve: (result: { data: unknown; error: unknown }) => unknown,
          ) =>
            Promise.resolve({
              data: account.errors[table]
                ? null
                : (account.tables[table] ?? []),
              error: account.errors[table] ?? null,
            }).then(resolve),
        };
        return query;
      },
    },
  })),
}));

vi.mock("../src/app/[locale]/account/actions", () => ({
  updateAccountProfile: vi.fn(),
  uploadProfileMedia: vi.fn(),
  requestAccountEmailChange: vi.fn(),
  requestAccountPasswordReset: vi.fn(),
  requestAccountDeletion: vi.fn(),
}));

vi.mock("../src/app/[locale]/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("../src/app/[locale]/account/subscription/actions", () => ({
  openBillingPortal: vi.fn(),
  startSubscriptionCheckout: vi.fn(),
}));

import ProfilePage from "../src/app/[locale]/account/profile/page";
import AccountSettingsPage from "../src/app/[locale]/account/settings/page";
import AccountPrivacyPage from "../src/app/[locale]/account/privacy/page";
import SubscriptionPage from "../src/app/[locale]/account/subscription/page";
import {
  updateAccountProfile,
  uploadProfileMedia,
  requestAccountEmailChange,
  requestAccountDeletion,
} from "../src/app/[locale]/account/actions";
import { openBillingPortal } from "../src/app/[locale]/account/subscription/actions";

const profile = {
  display_name: "Málaga Member",
  preferred_locale: "es",
  username: "malaga_member",
  bio: "Música y cultura",
  public_email: "public@example.test",
  phone: "+34000000000",
  website_url: "https://example.test",
  instagram_url: "https://www.instagram.com/fixture.member/",
  locality: "Málaga",
  province: "Málaga",
  birth_year: 2000,
  gender: "",
  profile_visibility: "members",
  contact_visibility: "private",
  attendance_visibility: "members",
};

beforeEach(() => {
  vi.clearAllMocks();
  account.tables = { profiles: { ...profile } };
  account.errors = {};
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  cleanup();
  for (const cookie of document.cookie.split("; ")) {
    document.cookie = `${cookie.split("=")[0]}=; Max-Age=0; Path=/`;
  }
  vi.unstubAllGlobals();
});

describe("Account control disclosure preserves existing workflows", () => {
  it.each(["en", "es"] as const)(
    "blocks profile edits and uploads when saved details cannot be loaded (%s)",
    async (locale) => {
      account.errors.profiles = { message: "Disposable profile read failure" };
      const { container } = render(
        await ProfilePage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({}),
        }),
      );
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        locale === "es" ? "Perfil" : "Profile",
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        locale === "es"
          ? "Tu perfil no está disponible"
          : "Your profile is unavailable",
      );
      expect(
        container.querySelectorAll("form,input,textarea,select"),
      ).toHaveLength(0);
      fireEvent.click(
        screen.getByRole("button", {
          name: locale === "es" ? "Reintentar" : "Try again",
        }),
      );
      expect(account.refresh).toHaveBeenCalledOnce();
      expect(updateAccountProfile).not.toHaveBeenCalled();
      expect(uploadProfileMedia).not.toHaveBeenCalled();
    },
  );

  it.each(["en", "es"] as const)(
    "submits all saved profile values when optional sections are closed (%s)",
    async (locale) => {
      const { container } = render(
        await ProfilePage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({}),
        }),
      );
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      const form = screen
        .getByRole("button", {
          name: locale === "es" ? "Guardar cambios" : "Save changes",
        })
        .closest("form")!;
      expect(
        Array.from(form.querySelectorAll("details")).every(
          (details) => !details.open,
        ),
      ).toBe(true);
      expect(Object.fromEntries(new FormData(form))).toEqual({
        locale,
        displayName: "Málaga Member",
        username: "malaga_member",
        bio: "Música y cultura",
        publicEmail: "public@example.test",
        phone: "+34000000000",
        websiteUrl: "https://example.test",
        instagramHandle: "fixture.member",
        locality: "Málaga",
        province: "Málaga",
        birthYear: "2000",
        gender: "",
        profileVisibility: "members",
        contactVisibility: "private",
        attendanceVisibility: "members",
        preferredLocale: "es",
      });
      const mediaForms = Array.from(
        container.querySelectorAll<HTMLFormElement>(
          "form.account-profile-upload",
        ),
      );
      expect(
        mediaForms.map((mediaForm) => new FormData(mediaForm).get("kind")),
      ).toEqual(["avatar", "banner"]);
      expect(mediaForms.every((mediaForm) => !form.contains(mediaForm))).toBe(
        true,
      );
      fireEvent.change(
        within(form).getByRole("textbox", {
          name: locale === "es" ? "Nombre visible" : "Display name",
        }),
        { target: { value: "Updated fixture" } },
      );
      fireEvent.submit(form);
      await waitFor(() => expect(updateAccountProfile).toHaveBeenCalledOnce());
      const submitted = vi.mocked(updateAccountProfile).mock.calls[0][0];
      expect(submitted.get("displayName")).toBe("Updated fixture");
      expect(submitted.get("publicEmail")).toBe("public@example.test");
      expect(submitted.get("contactVisibility")).toBe("private");
    },
  );

  it("keeps existing privacy defaults for a profile without optional details", async () => {
    account.tables.profiles = null;
    render(
      await ProfilePage({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({}),
      }),
    );
    const form = screen
      .getByRole("button", { name: "Save changes" })
      .closest("form")!;
    const data = new FormData(form);
    expect(data.get("profileVisibility")).toBe("public");
    expect(data.get("contactVisibility")).toBe("private");
    expect(data.get("attendanceVisibility")).toBe("private");
    expect(data.get("preferredLocale")).toBe("en");
  });

  it.each(["en", "es"] as const)(
    "shows pending email confirmation outside the closed edit form (%s)",
    async (locale) => {
      render(
        await AccountSettingsPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ email: "pending" }),
        }),
      );
      expect(screen.getByRole("status")).toBeVisible();
      expect(screen.getByText("member@example.test")).toBeVisible();
      const newEmail = screen.getByLabelText(
        locale === "es" ? "Nuevo correo" : "New email",
      );
      expect(newEmail).not.toBeVisible();
      expect(newEmail.closest("details")).not.toHaveAttribute("open");
      expect(requestAccountEmailChange).not.toHaveBeenCalled();
      expect(
        screen.getByRole("button", {
          name:
            locale === "es" ? "Cambiar mi contraseña" : "Change my password",
        }),
      ).toBeVisible();
      expect(
        screen.getByRole("button", {
          name: locale === "es" ? "Cerrar sesión" : "Sign out",
        }),
      ).toBeVisible();
    },
  );

  it("opens the email editor on validation failure and retains the existing action payload", async () => {
    render(
      await AccountSettingsPage({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({ error: "email-validation" }),
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid email address",
    );
    const input = screen.getByLabelText("New email");
    expect(input).toBeVisible();
    expect(input.closest("details")).toHaveAttribute("open");
    expect(screen.getByLabelText("Current email")).toBeDisabled();
    fireEvent.change(input, { target: { value: "changed@example.test" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() =>
      expect(requestAccountEmailChange).toHaveBeenCalledOnce(),
    );
    expect(
      Object.fromEntries(vi.mocked(requestAccountEmailChange).mock.calls[0][0]),
    ).toEqual({ locale: "en", email: "changed@example.test" });
  });

  it.each(["en", "es"] as const)(
    "keeps export and deletion separate from recommendation consent (%s)",
    async (locale) => {
      account.tables.personalisation_settings = {
        personalisation_enabled: false,
        marketing_enabled: false,
      };
      const { container } = render(
        await AccountPrivacyPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({}),
        }),
      );
      expect(screen.getByRole("checkbox")).not.toBeChecked();
      expect(fetch).not.toHaveBeenCalled();
      expect(
        screen.getByRole("link", {
          name: locale === "es" ? "Descargar mis datos" : "Download my data",
        }),
      ).toHaveAttribute("href", `/${locale}/account/export`);
      const deletion = container.querySelector<HTMLDetailsElement>(
        "details.sensitive-action",
      )!;
      expect(deletion.open).toBe(false);
      const confirmation = deletion.querySelector<HTMLInputElement>(
        "input[name=confirmation]",
      )!;
      expect(confirmation.required).toBe(true);
      expect(confirmation).not.toBeVisible();
      expect(requestAccountDeletion).not.toHaveBeenCalled();
      fireEvent.click(deletion.querySelector("summary")!);
      fireEvent.change(confirmation, {
        target: { value: locale === "es" ? "BORRAR" : "DELETE" },
      });
      fireEvent.submit(confirmation.closest("form")!);
      await waitFor(() =>
        expect(requestAccountDeletion).toHaveBeenCalledOnce(),
      );
      expect(
        Object.fromEntries(vi.mocked(requestAccountDeletion).mock.calls[0][0]),
      ).toEqual({
        locale,
        confirmation: locale === "es" ? "BORRAR" : "DELETE",
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("shows an existing deletion request without offering another request", async () => {
    account.tables.account_deletion_requests = {
      state: "processing",
      requested_at: "2026-10-10T12:00:00Z",
    };
    render(
      await AccountPrivacyPage({
        params: Promise.resolve({ locale: "es" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Tu solicitud está en proceso",
    );
    expect(screen.queryByText("Iniciar eliminación")).not.toBeInTheDocument();
  });

  it("retains legacy billing management beside the unified gated catalogue", async () => {
    account.tables.profiles = {
      membership_tier: "premium",
      business_plan_active: true,
      business_tier: "business",
    };
    account.tables.billing_subscriptions = [
      { plan_code: "premium", billing_interval: "month", status: "active" },
    ];
    account.tables.staff_billing_grants = [
      { plan_code: "business", grant_kind: "waived", expires_at: null },
    ];
    account.tables.billing_customers = { stripe_customer_id: "cus_fixture" };
    render(
      await SubscriptionPage({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({
          plan: "business_pro",
          category: "food",
        }),
      }),
    );
    const manage = screen
      .getByRole("button", { name: "Manage billing" })
      .closest("form")!;
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Business" }));
    expect(
      screen.queryByRole("heading", { name: "AkiHQ Pro" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: /Yearly/ }),
    ).not.toBeInTheDocument();
    const card = screen
      .getByRole("heading", { name: "AkiPasa Premium (for businesses)" })
      .closest("article")!;
    expect(
      within(card).getByRole("link", { name: "View my access" }),
    ).toHaveAttribute("href", "/en/account/subscription?audience=business");
    expect(card.querySelector("form")).toBeNull();
    expect(
      screen.getByRole("link", { name: /^Explore AkiBusiness/ }),
    ).toHaveAttribute("href", "https://akibusiness.com/?locale=en");
    expect(screen.getByText("AkiPasa Premium (legacy)")).toBeInTheDocument();
    expect(Object.fromEntries(new FormData(manage))).toEqual({ locale: "en" });
    fireEvent.submit(manage);
    await waitFor(() => expect(openBillingPortal).toHaveBeenCalledOnce());
  });
});
