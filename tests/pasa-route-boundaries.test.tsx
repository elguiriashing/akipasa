import React, { type ComponentProps } from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
} from "@testing-library/react";
import {
  PasaRouteFallback,
  fallbackHome,
} from "../src/components/PasaRouteFallback";
import {
  RouteBoundaryProvider,
  boundaryProduct,
  type RouteBoundaryProduct,
} from "../src/components/RouteBoundaryContext";
import RootNotFound from "../src/app/not-found";
import RootError from "../src/app/error";
import LocalNotFound from "../src/app/[locale]/not-found";
import LocalError from "../src/app/[locale]/error";
import Loading from "../src/app/[locale]/admin/loading";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: (props: ComponentProps<"img"> & { priority?: boolean }) => {
    const imageProps = { ...props };
    delete imageProps.priority;
    return React.createElement("img", { ...imageProps, alt: props.alt ?? "" });
  },
}));
const router = vi.hoisted(() => ({ refresh: vi.fn(), pathname: "/" }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => router.pathname,
}));
afterEach(() => {
  cleanup();
  router.refresh.mockClear();
  router.pathname = "/";
  window.history.replaceState(null, "", "/");
});
const products = [
  "akipasa",
  "akibusiness",
  "akiduermo",
  "akiconduzco",
] as const;
const locales = ["en", "es"] as const;

it.each(
  products.flatMap((product) => locales.map((locale) => ({ product, locale }))),
)(
  "$locale $product not-found uses only product-safe home and public presentation context",
  ({ product, locale }) => {
    render(
      <RouteBoundaryProvider locale={locale} product={product}>
        <RootNotFound />
      </RouteBoundaryProvider>,
    );
    const home = screen.getByRole("link", {
      name: locale === "es" ? "Volver al inicio" : "Back to the start",
    });
    expect(home).toHaveAttribute("href", fallbackHome(product, locale));
    expect(screen.getByRole("main")).toHaveAttribute(
      "data-boundary-product",
      product,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    if (product !== "akipasa")
      expect(
        screen.queryByRole("link", {
          name: /Explore the map|Explorar el mapa/,
        }),
      ).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("PRIVATE_PROVIDER_DETAIL");
  },
);
it.each(locales)(
  "%s localized fallback stays within the existing shell instead of adding navigation",
  (locale) => {
    const { container } = render(
      <RouteBoundaryProvider locale={locale} product="akipasa">
        <LocalNotFound />
      </RouteBoundaryProvider>,
    );
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector(".app-shell")).toBeNull();
    expect(container.querySelector(".pasa-bottom-dock")).toBeNull();
    expect(
      screen.getByRole("link", {
        name: locale === "es" ? "Volver al inicio" : "Back to the start",
      }),
    ).toHaveAttribute("href", `/${locale}`);
  },
);
it.each([RootError, LocalError])(
  "error boundary ignores error contents and retries only on explicit action",
  (Component) => {
    const reset = vi.fn(),
      error = Object.assign(
        new Error(
          "PRIVATE_PROVIDER_DETAIL token=secret user=private@example.test",
        ),
        { digest: "PRIVATE_DIGEST" },
      );
    render(
      <RouteBoundaryProvider locale="en" product="akipasa">
        <Component error={error} reset={reset} />
      </RouteBoundaryProvider>,
    );
    expect(document.body).not.toHaveTextContent(
      /PRIVATE_|secret|private@example/,
    );
    expect(reset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  },
);
it.each(locales)(
  "%s loading is indeterminate, announced and contains no fabricated action or percent",
  (locale) => {
    render(
      <RouteBoundaryProvider locale={locale} product="akipasa">
        <Loading />
      </RouteBoundaryProvider>,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent(
      locale === "es" ? "Cargando página" : "Loading page",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/\d+%/);
  },
);
it("context changes refresh both locale and product without retaining another brand", () => {
  const { rerender } = render(
    <RouteBoundaryProvider locale="en" product="akipasa">
      <PasaRouteFallback kind="error" />
    </RouteBoundaryProvider>,
  );
  rerender(
    <RouteBoundaryProvider locale="es" product="akiduermo">
      <PasaRouteFallback kind="error" />
    </RouteBoundaryProvider>,
  );
  expect(screen.getByRole("main")).toHaveAttribute(
    "data-boundary-product",
    "akiduermo",
  );
  expect(
    screen.getByRole("link", { name: "Volver al inicio" }),
  ).toHaveAttribute("href", "https://akiduermo.com/?lang=es");
});
it.each([null, "unknown", "https://evil.invalid/token=secret"])(
  "unknown product %s fails safely to the public AkiPasa presentation",
  (product) => {
    expect(boundaryProduct(product)).toBe("akipasa");
    render(
      <RouteBoundaryProvider locale="en" product={product}>
        <PasaRouteFallback kind="not-found" />
      </RouteBoundaryProvider>,
    );
    expect(screen.getByRole("main")).toHaveAttribute(
      "data-boundary-product",
      "akipasa",
    );
    expect(document.body).not.toHaveTextContent("evil.invalid");
  },
);
it.each(products)(
  "%s safe homes contain no caller-controlled URL",
  (product) => {
    for (const locale of locales)
      expect(fallbackHome(product as RouteBoundaryProduct, locale)).not.toMatch(
        /secret|token|next=/,
      );
  },
);

it("Admin loading remains a section under its authorized workspace main and keeps the heading hierarchy", () => {
  const { container } = render(
    <main>
      <h1>Administration</h1>
      <RouteBoundaryProvider locale="en" product="akipasa">
        <Loading />
      </RouteBoundaryProvider>
    </main>,
  );
  expect(container.querySelectorAll("main")).toHaveLength(1);
  expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
    "Getting your page ready",
  );
});

it("pending retry remains disabled and announced without exposing internal errors", () => {
  render(
    <RouteBoundaryProvider locale="es" product="akipasa">
      <PasaRouteFallback kind="error" pending reset={() => {}} />
    </RouteBoundaryProvider>,
  );
  expect(screen.getByRole("button", { name: "Reintentando…" })).toBeDisabled();
});

it.each([
  {
    product: "akibusiness" as const,
    en: "https://akibusiness.com/?locale=en",
    es: "https://akibusiness.com/?locale=es",
  },
  {
    product: "akiduermo" as const,
    en: "https://akiduermo.com/?lang=en",
    es: "https://akiduermo.com/?lang=es",
  },
  {
    product: "akiconduzco" as const,
    en: "https://akicoches.com/?lang=en",
    es: "https://akicoches.com/?lang=es",
  },
])(
  "$product fallback uses the approved independent-product home instead of legacy management",
  ({ product, en, es }) => {
    expect(fallbackHome(product, "en")).toBe(en);
    expect(fallbackHome(product, "es")).toBe(es);
  },
);

it("exact localized path updates a persistent provider even when RootLayout props stay English", () => {
  router.pathname = "/en/missing";
  const child = <PasaRouteFallback kind="not-found" />;
  const { rerender } = render(
    <RouteBoundaryProvider locale="en" product="akipasa">
      {child}
    </RouteBoundaryProvider>,
  );
  router.pathname = "/es/missing";
  rerender(
    <RouteBoundaryProvider locale="en" product="akipasa">
      {child}
    </RouteBoundaryProvider>,
  );
  expect(
    screen.getByRole("link", { name: "Volver al inicio" }),
  ).toHaveAttribute("href", "/es");
  expect(document.documentElement.lang).toBe("es");
});
it("non-Pasa lang changes use only the existing sanitized URL locale", () => {
  render(
    <RouteBoundaryProvider locale="en" product="akiduermo">
      <PasaRouteFallback kind="error" />
    </RouteBoundaryProvider>,
  );
  act(() => {
    window.history.replaceState(
      null,
      "",
      "/stays/missing?lang=es&token=private",
    );
    window.dispatchEvent(
      new CustomEvent("akipasa:locale-change", { detail: "es" }),
    );
  });
  expect(
    screen.getByRole("link", { name: "Volver al inicio" }),
  ).toHaveAttribute("href", "https://akiduermo.com/?lang=es");
  expect(document.body).not.toHaveTextContent("private");
  act(() => {
    window.history.replaceState(null, "", "/stays/missing?lang=private");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(screen.getByRole("link", { name: "Back to the start" })).toBeVisible();
});
it("Pasa ignores query-only locale overrides and accepts only exact localized route segments", () => {
  router.pathname = "/english/missing";
  window.history.replaceState(null, "", "/english/missing?lang=es");
  render(
    <RouteBoundaryProvider locale="en" product="akipasa">
      <PasaRouteFallback kind="not-found" />
    </RouteBoundaryProvider>,
  );
  expect(
    screen.getByRole("link", { name: "Back to the start" }),
  ).toHaveAttribute("href", "/en");
});
