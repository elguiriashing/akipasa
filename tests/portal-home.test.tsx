// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  BusinessHome,
  type ManagedPlace,
} from "../src/components/BusinessHome";
import { StayHeader } from "../src/components/StayHeader";
import { BusinessHeader } from "../src/components/BusinessHeader";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/en/business",
  useSearchParams: () => new URLSearchParams("view=venues"),
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
vi.mock("../src/components/ThemeModeControls", () => ({
  ThemeToggle: () => <button aria-label="Theme" />,
}));
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const places: ManagedPlace[] = Array.from({ length: 19 }, (_, index) => ({
  id: String(index),
  name: index === 18 ? "Málaga HQ" : `Place ${String(index).padStart(2, "0")}`,
  slug: index === 0 ? "akipasa-editorial" : `place-${index}`,
  role: index % 2 ? "manager" : "owner",
  product: index >= 10 ? "stay" : "venue",
  status: index % 2 ? "draft" : "published",
}));
it.each(["en", "es"] as const)(
  "pages a mixed authorised catalogue and combines search/type/status in %s",
  (locale) => {
    const es = locale === "es";
    const { container } = render(
      <BusinessHome locale={locale} places={places} deleteAction={vi.fn()} />,
    );
    expect(container.querySelectorAll("article")).toHaveLength(8);
    fireEvent.click(
      screen.getByRole("button", { name: es ? "Siguiente" : "Next" }),
    );
    expect(container.querySelectorAll("article")).toHaveLength(8);
    expect(screen.getByText("2 / 3")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: es ? /^Alojamientos/ : /^Stays/ }),
    );
    expect(screen.getByText("1 / 2")).toBeVisible();
    expect(
      Array.from(container.querySelectorAll("article")).every(
        (article) => article.dataset.product === "stay",
      ),
    ).toBe(true);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "malaga" },
    });
    expect(container.querySelectorAll("article")).toHaveLength(1);
    expect(
      screen.getByRole("link", {
        name: `${es ? "Gestionar" : "Manage"} Málaga HQ`,
      }),
    ).toHaveAttribute("href", `/${locale}/business/venue/18`);
    fireEvent.change(screen.getByLabelText(es ? "Estado" : "Status"), {
      target: { value: "draft" },
    });
    expect(container.querySelectorAll("article")).toHaveLength(0);
    fireEvent.click(
      screen.getByRole("button", {
        name: es ? "Restablecer filtros" : "Reset filters",
      }),
    );
    expect(container.querySelectorAll("article")).toHaveLength(8);
  },
);
it.each(["en", "es"] as const)(
  "shares ordered controls and branded app destinations while excluding the current app in %s",
  (locale) => {
    for (const product of ["business", "duermo"] as const) {
      const { container, unmount } = render(
        product === "business" ? (
          <BusinessHeader locale={locale} signedIn signOut={vi.fn()} />
        ) : (
          <StayHeader locale={locale} onLanguageChange={vi.fn()} />
        ),
      );
      const tools = container.querySelector(".portal-header-tools")!;
      expect(tools.children).toHaveLength(3);
      expect(tools.children[0]).toHaveTextContent(
        locale === "es" ? "EN" : "ES",
      );
      expect(tools.children[1]).toHaveAttribute("aria-label", "Theme");
      expect(tools.children[2].tagName).toBe("DETAILS");
      const menu = tools.querySelector("details")!;
      menu.setAttribute("open", "");
      const popover = tools.querySelector(
        ".portal-product-popover",
      )! as HTMLElement;
      expect(
        within(popover).queryByRole("link", {
          name: product === "business" ? "AkiBusiness" : "AkiDuermo",
        }),
      ).toBeNull();
      const pasa = within(popover).getByRole("link", {
        name: "AkiPasa",
      });
      expect(pasa).toHaveAttribute("href", `https://akipasa.com/${locale}`);
      expect(pasa.querySelector("img")).toHaveAttribute(
        "src",
        "/pwa/akipasa-512.png",
      );
      expect(
        within(popover)
          .getByRole("link", { name: "AkiHQ" })
          .querySelector("img"),
      ).toHaveAttribute("src", "/brand/hq-icon.png");
      const other = within(popover).getByRole("link", {
        name: product === "business" ? "AkiDuermo" : "AkiBusiness",
      });
      expect(other).toHaveAttribute(
        "href",
        product === "business"
          ? `https://akiduermo.akipasa.com/?lang=${locale}`
          : `https://business.akipasa.com/${locale}/business`,
      );
      fireEvent.keyDown(document, { key: "Escape" });
      expect(menu).not.toHaveAttribute("open");
      expect(menu.querySelector("summary")).toHaveFocus();
      menu.setAttribute("open", "");
      fireEvent.pointerDown(document.body);
      expect(menu).not.toHaveAttribute("open");
      unmount();
    }
  },
);
it("retains business locale query state and only offers logout when signed in", () => {
  const { container } = render(
    <BusinessHeader locale="en" signedIn={false} signOut={vi.fn()} />,
  );
  expect(
    screen.getByRole("link", { name: "Cambiar a español" }),
  ).toHaveAttribute("href", "/es/business?view=venues");
  container.querySelector("details")!.setAttribute("open", "");
  expect(screen.queryByRole("button", { name: "Log out" })).toBeNull();
});
it("keeps destructive actions outside primary navigation and preserves owner/editorial gates", () => {
  const { container } = render(
    <BusinessHome locale="en" places={places} deleteAction={vi.fn()} />,
  );
  const cards = container.querySelectorAll("article");
  expect(within(cards[1]).queryByRole("button", { name: /Delete/ })).toBeNull();
  expect(within(cards[2]).queryByRole("button", { name: /Delete/ })).toBeNull();
  const ownerCard = cards[3];
  const menu = ownerCard.querySelector("details")!;
  expect(menu).not.toHaveAttribute("open");
  menu.setAttribute("open", "");
  const showModal = vi.fn();
  const dialog = ownerCard.querySelector("dialog")!;
  dialog.showModal = showModal;
  fireEvent.click(
    within(ownerCard).getByRole("button", { name: /Delete Place 02/ }),
  );
  expect(showModal).toHaveBeenCalledOnce();
  expect(
    within(ownerCard).queryByRole("button", { name: "Delete permanently" }),
  ).toBeNull();
});
it("shows a read failure separately from an empty catalogue", () => {
  render(
    <BusinessHome locale="en" places={[]} readError deleteAction={vi.fn()} />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Could not load your places",
  );
  expect(screen.queryByText("Your first business starts here")).toBeNull();
});
it("offers the existing claim path when there are no managed places", () => {
  render(<BusinessHome locale="es" places={[]} deleteAction={vi.fn()} />);
  expect(
    screen.getByRole("link", { name: "Encontrar mi negocio" }),
  ).toHaveAttribute("href", "/es/business?view=claims");
});
it.each(["en", "es"] as const)(
  "uses the supplied green mark and the same header destinations in %s",
  (locale) => {
    const change = vi.fn();
    const { container } = render(
      <StayHeader locale={locale} onLanguageChange={change} />,
    );
    expect(
      screen.getByRole("link", {
        name: locale === "es" ? "Inicio de AkiDuermo" : "AkiDuermo home",
      }),
    ).toHaveAttribute("href", `/?lang=${locale}`);
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/brand/duermo-icon.png",
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "es" ? "Switch to English" : "Cambiar a español",
      }),
    );
    expect(change).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("link", {
        name: locale === "es" ? "Ajustes" : "Settings",
      }),
    ).toHaveAttribute("href", `/settings?lang=${locale}`);
  },
);
