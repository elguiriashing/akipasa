// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resolveProductRoles } from "../src/lib/product-roles";
import { config } from "../src/lib/config";
import { BusinessHeader } from "../src/components/BusinessHeader";
import { PortalHeaderTools } from "../src/components/PortalHeaderTools";
import { AccountWorkspacePortals } from "../src/components/AccountWorkspacePortals";
import { ConsoleSwitcher } from "../src/components/ConsoleSwitcher";
import { AppShell } from "../src/components/AppShell";
import AuthPage from "../src/app/[locale]/auth/page";

const state = vi.hoisted(() => ({ product: "akipasa" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-akipasa-product": state.product }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/en",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => {
    throw new Error("not found");
  },
}));
vi.mock("next/image", () => ({
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean },
  ) => {
    const imageProps = { ...props };
    delete imageProps.priority;
    return React.createElement("img", imageProps);
  },
}));
vi.mock("../src/components/LanguageLink", () => ({
  LanguageLink: () => <span>Language</span>,
}));
vi.mock("../src/components/GlobalSearch", () => ({ GlobalSearch: () => null }));
vi.mock("../src/components/ThemeModeControls", () => ({
  ThemeToggle: () => <button>Theme</button>,
}));
vi.mock("../src/app/[locale]/auth/actions", () => ({
  requestMagicLink: vi.fn(),
  requestPasswordReset: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
}));
const original = { ...config };
beforeEach(() => {
  vi.stubGlobal("React", React);
  state.product = "akipasa";
});
afterEach(() => {
  cleanup();
  Object.assign(config, original);
  vi.unstubAllGlobals();
});
function setRoles(swapped: boolean) {
  const roles = resolveProductRoles({ roleSwap: swapped ? "true" : "false" });
  Object.assign(config, {
    roleSwap: roles.swapped,
    businessUrl: roles.managementUrl,
    crmUrl: roles.operationsUrl,
    managementName: roles.managementName,
    operationsName: roles.operationsName,
    managementLogo: roles.managementLogo,
    operationsLogo: roles.operationsLogo,
  });
  return roles;
}

it("requires exact true and preserves all default legacy origins otherwise", () => {
  for (const roleSwap of [undefined, "", "false", "TRUE", "1"]) {
    expect(resolveProductRoles({ roleSwap })).toMatchObject({
      swapped: false,
      managementUrl: "https://business.akipasa.com",
      operationsUrl: "https://crm.akipasa.com",
    });
  }
  expect(resolveProductRoles({ roleSwap: "true" })).toMatchObject({
    swapped: true,
    managementUrl: "https://akihq.app",
    operationsUrl: "https://akibusiness.com",
  });
});
it("maps known old canonical aliases only during cutover and retains preview origins", () => {
  for (const managementUrl of [
    "https://business.akipasa.com/",
    "https://akibusiness.com",
    "https://www.akibusiness.com/",
  ]) {
    expect(
      resolveProductRoles({ roleSwap: "true", managementUrl }).managementUrl,
    ).toBe("https://akihq.app");
  }
  for (const operationsUrl of [
    "https://crm.akipasa.com/",
    "https://akihq.app",
    "https://www.akihq.app/",
  ]) {
    expect(
      resolveProductRoles({ roleSwap: "true", operationsUrl }).operationsUrl,
    ).toBe("https://akibusiness.com");
  }
  for (const preview of [
    "https://management-preview.example.test",
    "http://localhost:3101",
  ]) {
    expect(
      resolveProductRoles({
        roleSwap: "true",
        managementUrl: preview,
        operationsUrl: preview,
      }),
    ).toMatchObject({ managementUrl: preview, operationsUrl: preview });
  }
  for (const unsafe of [
    "javascript:alert(1)",
    "https://user:password@example.test",
    "https://example.test/?token=x",
    "https://example.test/path",
    "http://example.test",
  ]) {
    expect(
      resolveProductRoles({ roleSwap: "true", managementUrl: unsafe })
        .managementUrl,
    ).toBe("https://akihq.app");
  }
});

it.each(["en", "es"] as const)(
  "renders matching management/operations names, icons and links in %s",
  async (locale) => {
    for (const swapped of [false, true]) {
      const roles = setRoles(swapped);
      const { container } = render(
        <PortalHeaderTools locale={locale} product="duermo" />,
      );
      const management = screen.getByRole("link", {
        name: roles.managementName,
        hidden: true,
      });
      expect(management).toHaveAttribute(
        "href",
        `${roles.managementUrl}/${locale}/business`,
      );
      expect(management.querySelector("img")).toHaveAttribute(
        "src",
        `/brand/${roles.managementLogo}-icon.png`,
      );
      expect(
        screen.getByRole("link", { name: roles.operationsName, hidden: true }),
      ).toHaveAttribute("href", roles.operationsUrl);
      expect(container.textContent).toContain(roles.operationsName);
      cleanup();
      render(
        <BusinessHeader locale={locale} signedIn={false} signOut={vi.fn()} />,
      );
      expect(
        screen.getByRole("link", { name: roles.managementName }),
      ).toHaveAttribute("href", `/${locale}/business`);
      cleanup();
      render(<AccountWorkspacePortals locale={locale} role="moderator" />);
      expect(
        screen.getByRole("link", {
          name:
            locale === "es"
              ? `Abrir ${roles.operationsName}`
              : `Open ${roles.operationsName}`,
        }),
      ).toHaveAttribute("href", roles.operationsUrl);
      cleanup();
      render(<ConsoleSwitcher locale={locale} role="organiser" />);
      expect(
        screen.getByRole("link", {
          name: swapped
            ? roles.managementName
            : locale === "es"
              ? "Negocio"
              : "Business",
        }),
      ).toHaveAttribute("href", `${roles.managementUrl}/${locale}/business`);
      cleanup();
      const page = await AuthPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({}),
      });
      render(page);
      expect(
        screen.getByRole("link", { name: roles.managementName }),
      ).toHaveAttribute(
        "href",
        `${roles.managementUrl}/${locale}/auth?next=/${locale}/business`,
      );
      expect(
        screen.getByRole("link", { name: roles.operationsName }),
      ).toHaveAttribute("href", roles.operationsUrl);
      cleanup();
    }
  },
);

it("changes public management navigation without granting additional role access", () => {
  const roles = setRoles(true);
  render(
    <AppShell locale="en" signedIn role="organiser">
      <p>Content</p>
    </AppShell>,
  );
  expect(
    screen
      .getAllByRole("link", { name: roles.managementName })
      .every(
        (link) => link.getAttribute("href") === "https://akihq.app/en/business",
      ),
  ).toBe(true);
  cleanup();
  render(<AccountWorkspacePortals locale="en" role="consumer" />);
  expect(
    screen.queryByRole("link", { name: "Open AkiBusiness" }),
  ).not.toBeInTheDocument();
});

it("retains the same-host internal auth return while relabelling the management host", async () => {
  setRoles(true);
  state.product = "akibusiness";
  render(
    await AuthPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ next: "/en/business/venue/example" }),
    }),
  );
  expect(
    screen.getByRole("heading", { name: "Sign in to AkiHQ" }),
  ).toBeInTheDocument();
  const destinations =
    document.querySelectorAll<HTMLInputElement>('input[name="next"]');
  expect(destinations.length).toBeGreaterThan(0);
  expect(
    [...destinations].every(
      (input) => input.value === "/en/business/venue/example",
    ),
  ).toBe(true);
});
