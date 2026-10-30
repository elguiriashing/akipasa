import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";

const prefs = {
  background: "aurora",
  accent: "gold",
  motion: false,
  glass: true,
  backgroundImagePath: null,
} as const;
afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.doUnmock("../src/components/owner/OwnerToolboxPanel");
});

it.each(["click", "ctrl", "meta"])(
  "defers panel import until %s, applies appearance immediately, and deduplicates pending loads",
  async (activation) => {
    let resolve!: (value: Record<string, unknown>) => void;
    const load = vi.fn(
      () =>
        new Promise<Record<string, unknown>>((r) => {
          resolve = r;
        }),
    );
    vi.doMock("../src/components/owner/OwnerToolboxPanel", load);
    const { OwnerToolboxLauncher } = await import(
      "../src/components/owner/OwnerToolboxLauncher"
    );
    render(
      <OwnerToolboxLauncher locale="es" preferences={prefs} userId="fixture" />,
    );
    expect(load).not.toHaveBeenCalled();
    expect(document.documentElement.dataset).toMatchObject({
      ownerBackground: "aurora",
      ownerAccent: "gold",
      ownerMotion: "false",
      ownerGlass: "true",
    });
    if (activation === "click")
      fireEvent.click(screen.getByRole("button", { name: "DEV Toolbox" }));
    else
      fireEvent.keyDown(window, {
        key: "O",
        shiftKey: true,
        ctrlKey: activation === "ctrl",
        metaKey: activation === "meta",
      });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("button", { name: "DEV Cargando…" }),
    ).toBeDisabled();
    fireEvent.keyDown(window, { key: "o", shiftKey: true, ctrlKey: true });
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () =>
      resolve({
        OwnerToolboxPanel: ({ initiallyOpen }: { initiallyOpen: boolean }) => (
          <div role="dialog">{String(initiallyOpen)}</div>
        ),
      }),
    );
    expect(await screen.findByRole("dialog")).toHaveTextContent("true");
  },
);

it("ignores a panel import completing after unmount", async () => {
  let resolve!: (value: Record<string, unknown>) => void;
  vi.doMock(
    "../src/components/owner/OwnerToolboxPanel",
    () =>
      new Promise<Record<string, unknown>>((r) => {
        resolve = r;
      }),
  );
  const { OwnerToolboxLauncher } = await import(
    "../src/components/owner/OwnerToolboxLauncher"
  );
  const view = render(
    <OwnerToolboxLauncher locale="en" preferences={prefs} userId="fixture" />,
  );
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(resolve).toBeTypeOf("function"));
  view.unmount();
  const panel = vi.fn(() => <div role="dialog" />);
  await act(async () => resolve({ OwnerToolboxPanel: panel }));
  expect(panel).not.toHaveBeenCalled();
});

it.each(["en", "es"] as const)(
  "%s load failure retains a retryable localized trigger",
  async (locale) => {
    vi.doMock("../src/components/owner/OwnerToolboxPanel", () => {
      throw new Error("fixture chunk unavailable");
    });
    const { OwnerToolboxLauncher } = await import(
      "../src/components/owner/OwnerToolboxLauncher"
    );
    render(
      <OwnerToolboxLauncher
        locale={locale}
        preferences={prefs}
        userId="fixture"
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    const retry = await screen.findByRole("button", {
      name: locale === "es" ? "DEV Reintentar" : "DEV Retry toolbox",
    });
    expect(retry).toBeEnabled();
    vi.doMock("../src/components/owner/OwnerToolboxPanel", () => ({
      OwnerToolboxPanel: () => <div role="dialog">Recovered</div>,
    }));
    fireEvent.click(retry);
    expect(await screen.findByRole("dialog")).toHaveTextContent("Recovered");
  },
);

const fixtureImagePath =
  "00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.webp";
const fixtureImageUrl =
  "https://owner-fixture.example.invalid/selected.webp?token=synthetic-only";

it.each(["orange", "teal", "violet", "pink", "gold"] as const)(
  "restores the private photo with the retained %s accent before opening tools",
  async (accent) => {
    const load = vi.fn();
    vi.doMock("../src/components/owner/OwnerToolboxPanel", load);
    const { OwnerToolboxLauncher } = await import(
      "../src/components/owner/OwnerToolboxLauncher"
    );
    const photo = {
      ...prefs,
      accent,
      backgroundImagePath: fixtureImagePath,
      backgroundImageUrl: fixtureImageUrl,
    };
    const view = render(
      <OwnerToolboxLauncher locale="en" preferences={photo} userId="fixture" />,
    );
    const root = document.documentElement;
    expect(root.style.getPropertyValue("--owner-background-image")).toBe(
      `url(${JSON.stringify(fixtureImageUrl)})`,
    );
    expect(root.dataset.ownerCustomBackground).toBe("true");
    expect(root.dataset).toMatchObject({
      ownerBackground: "aurora",
      ownerAccent: accent,
      ownerMotion: "false",
      ownerGlass: "true",
    });
    expect(load).not.toHaveBeenCalled();
    view.unmount();
    expect(root.style.getPropertyValue("--owner-background-image")).toBe("");
    expect(root.dataset.ownerCustomBackground).toBeUndefined();
  },
);

it.each([
  { backgroundImagePath: null, backgroundImageUrl: fixtureImageUrl },
  { backgroundImagePath: fixtureImagePath, backgroundImageUrl: null },
  { backgroundImagePath: null, backgroundImageUrl: null },
])(
  "clears a previous private photo when the restored selection is %j",
  async (next) => {
    const { OwnerToolboxLauncher } = await import(
      "../src/components/owner/OwnerToolboxLauncher"
    );
    const photo = {
      ...prefs,
      backgroundImagePath: fixtureImagePath,
      backgroundImageUrl: fixtureImageUrl,
    };
    const view = render(
      <OwnerToolboxLauncher locale="en" preferences={photo} userId="fixture" />,
    );
    const root = document.documentElement;
    expect(root.dataset.ownerCustomBackground).toBe("true");
    view.rerender(
      <OwnerToolboxLauncher
        locale="en"
        preferences={{ ...prefs, ...next }}
        userId="fixture"
      />,
    );
    expect(root.style.getPropertyValue("--owner-background-image")).toBe("");
    expect(root.dataset.ownerCustomBackground).toBeUndefined();
    expect(root.dataset.ownerAccent).toBe("gold");
  },
);

it("replaces the selected private image without retaining the previous URL", async () => {
  const { OwnerToolboxLauncher } = await import(
    "../src/components/owner/OwnerToolboxLauncher"
  );
  const photo = {
    ...prefs,
    backgroundImagePath: fixtureImagePath,
    backgroundImageUrl: fixtureImageUrl,
  };
  const view = render(
    <OwnerToolboxLauncher locale="en" preferences={photo} userId="fixture" />,
  );
  const replacement =
    "https://owner-fixture.example.invalid/replacement.webp?token=second-synthetic";
  view.rerender(
    <OwnerToolboxLauncher
      locale="en"
      preferences={{ ...photo, backgroundImageUrl: replacement }}
      userId="fixture"
    />,
  );
  expect(
    document.documentElement.style.getPropertyValue("--owner-background-image"),
  ).toBe(`url(${JSON.stringify(replacement)})`);
  expect(
    document.documentElement.style.getPropertyValue("--owner-background-image"),
  ).not.toContain(fixtureImageUrl);
});

it("does not erase another renderer's image or unrelated theme state on unmount", async () => {
  const { OwnerToolboxLauncher } = await import(
    "../src/components/owner/OwnerToolboxLauncher"
  );
  const photo = {
    ...prefs,
    backgroundImagePath: fixtureImagePath,
    backgroundImageUrl: fixtureImageUrl,
  };
  const view = render(
    <OwnerToolboxLauncher locale="en" preferences={photo} userId="fixture" />,
  );
  const root = document.documentElement;
  const other = 'url("https://another-fixture.example.invalid/own.webp")';
  root.style.setProperty("--owner-background-image", other);
  root.dataset.theme = "light";
  root.dataset.ownerCustomBackground = "true";
  view.unmount();
  expect(root.style.getPropertyValue("--owner-background-image")).toBe(other);
  expect(root.dataset.ownerCustomBackground).toBe("true");
  expect(root.dataset.theme).toBe("light");
  root.style.removeProperty("--owner-background-image");
  delete root.dataset.ownerCustomBackground;
});

it("keeps the separately selected photo when its base background changes", async () => {
  const { OwnerToolboxLauncher } = await import(
    "../src/components/owner/OwnerToolboxLauncher"
  );
  const photo = {
    ...prefs,
    backgroundImagePath: fixtureImagePath,
    backgroundImageUrl: fixtureImageUrl,
  };
  const view = render(
    <OwnerToolboxLauncher locale="en" preferences={photo} userId="fixture" />,
  );
  for (const background of ["midnight", "aurora", "none"] as const) {
    view.rerender(
      <OwnerToolboxLauncher
        locale="en"
        preferences={{ ...photo, background }}
        userId="fixture"
      />,
    );
    expect(document.documentElement.dataset.ownerBackground).toBe(background);
    expect(document.documentElement.dataset.ownerCustomBackground).toBe("true");
    expect(
      document.documentElement.style.getPropertyValue(
        "--owner-background-image",
      ),
    ).toBe(`url(${JSON.stringify(fixtureImageUrl)})`);
  }
  view.rerender(
    <OwnerToolboxLauncher locale="en" preferences={prefs} userId="fixture" />,
  );
  expect(
    document.documentElement.dataset.ownerCustomBackground,
  ).toBeUndefined();
  expect(
    document.documentElement.style.getPropertyValue("--owner-background-image"),
  ).toBe("");
});
