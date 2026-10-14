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
