import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
const actions = vi.hoisted(() => ({
  read: vi.fn(async () => ({
    data: { test_account: true, collection: { families: [] } },
  })),
  save: vi.fn(async () => ({})),
  grant: vi.fn(async () => ({})),
}));
vi.mock("../src/app/[locale]/admin/passports/awards/actions", () => ({
  passportAdminAction: actions.read,
}));
vi.mock("../src/app/[locale]/owner/actions", () => ({
  saveToolboxAppearance: actions.save,
  ownerPalsGrant: actions.grant,
}));
import { OwnerToolboxLauncher } from "../src/components/owner/OwnerToolboxLauncher";
const preferences = {
  background: "aurora",
  accent: "gold",
  motion: false,
  glass: true,
  backgroundImagePath: null,
} as const;
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it.each(["en", "es"] as const)(
  "%s real extracted panel retains state through Escape, trigger and shortcut reopen",
  async (locale) => {
    render(
      <OwnerToolboxLauncher
        locale={locale}
        preferences={preferences}
        userId="fixture"
      />,
    );
    expect(actions.read).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "DEV Toolbox" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await waitFor(() => expect(actions.read).toHaveBeenCalledTimes(1));
    expect(actions.read).toHaveBeenCalledWith(
      locale,
      expect.objectContaining({
        action: "read",
        payload: expect.objectContaining({ profile_id: "fixture" }),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "AkiPals" }));
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "42" },
    });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "DEV Toolbox" }));
    expect(screen.getByRole("spinbutton")).toHaveValue(42);
    fireEvent.keyDown(window, { key: "o", ctrlKey: true, shiftKey: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "o", metaKey: true, shiftKey: true });
    expect(screen.getByRole("spinbutton")).toHaveValue(42);
    expect(actions.read).toHaveBeenCalledTimes(1);
    expect(actions.grant).not.toHaveBeenCalled();
    expect(actions.save).not.toHaveBeenCalled();
  },
);
