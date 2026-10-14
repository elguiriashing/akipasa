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
  within,
} from "@testing-library/react";
import { SupportAgentLauncher } from "../src/components/support/SupportAgentLauncher";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  vi.unstubAllGlobals();
});

function mount(locale: "en" | "es" = "en") {
  render(
    <>
      <button>Outside control</button>
      <SupportAgentLauncher
        locale={locale}
        surface="site_contact"
        label="Help"
        signedIn
      />
    </>,
  );
  const opener = screen.getByRole("button", { name: "Help" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

it.each(["en", "es"] as const)(
  "contains %s dialog keyboard and programmatic focus",
  async (locale) => {
    const opener = mount(locale);
    const dialog = screen.getByRole("dialog");
    const textarea = within(dialog).getByRole("textbox");
    expect(textarea).toHaveFocus();
    expect(opener).toHaveAttribute("aria-expanded", "true");
    expect(opener).toHaveAttribute("aria-controls", dialog.id);
    const close = within(dialog).getByRole("button", {
      name: locale === "es" ? "Cerrar ayuda" : "Close help",
    });
    const email = within(dialog).getByRole("link");
    // Disabled Send is excluded from the focus order.
    email.focus();
    fireEvent.keyDown(email, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(email).toHaveFocus();
    fireEvent.change(textarea, { target: { value: "A question" } });
    const send = within(dialog).getByRole("button", {
      name: locale === "es" ? "Enviar" : "Send",
    });
    close.focus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(send).toHaveFocus();
    screen.getByRole("button", { name: "Outside control" }).focus();
    expect(textarea).toHaveFocus();
    fireEvent.keyDown(textarea, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(opener).toHaveFocus();
    expect(opener).toHaveAttribute("aria-expanded", "false");
  },
);

it("restores existing scroll state and opener on Close and backdrop dismissal", () => {
  document.body.style.overflow = "auto";
  const opener = mount();
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent.click(screen.getByRole("button", { name: "Close help" }));
  expect(document.body.style.overflow).toBe("auto");
  expect(opener).toHaveFocus();
  fireEvent.click(opener);
  fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.style.overflow).toBe("auto");
  expect(opener).toHaveFocus();
});

it("restores scroll state and removes focus containment when unmounted", () => {
  const { unmount } = render(
    <SupportAgentLauncher
      locale="en"
      surface="site_contact"
      label="Help"
      signedIn
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Help" }));
  expect(document.body.style.overflow).toBe("hidden");
  unmount();
  expect(document.body.style.overflow).toBe("");
  const outside = document.createElement("button");
  document.body.append(outside);
  outside.focus();
  expect(outside).toHaveFocus();
  outside.remove();
});

it("closes and restores scroll if its authenticated surface is replaced", () => {
  const { rerender } = render(
    <SupportAgentLauncher
      locale="en"
      surface="site_contact"
      label="Help"
      signedIn
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Help" }));
  expect(document.body.style.overflow).toBe("hidden");
  rerender(
    <SupportAgentLauncher
      locale="en"
      surface="site_contact"
      label="Help"
      signedIn={false}
    />,
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.body.style.overflow).toBe("");
  rerender(
    <SupportAgentLauncher
      locale="en"
      surface="site_contact"
      label="Help"
      signedIn
    />,
  );
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("preserves the existing support payload, transcript and error path", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ message: "Inert provider failure" }),
  });
  vi.stubGlobal("fetch", fetchMock);
  const opener = mount();
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Need help" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Inert provider failure",
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/support-agent/chat");
  expect(JSON.parse(options.body)).toEqual({
    message: "Need help",
    locale: "en",
    surface: "site_contact",
    pagePath: window.location.pathname,
    formContext: {},
  });
  expect(screen.getByText("Need help")).toBeVisible();
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
  fireEvent.click(opener);
  expect(screen.getByText("Need help")).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("keeps anonymous help as the existing email fallback", () => {
  render(
    <SupportAgentLauncher
      locale="es"
      surface="site_contact"
      label="Ayuda"
      signedIn={false}
    />,
  );
  const link = screen.getByRole("link", { name: "Ayuda" });
  expect(link).toHaveAttribute(
    "href",
    "mailto:support@akipasa.com?subject=Ayuda%20con%20AkiPasa",
  );
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("keeps Escape inside Support while an outer menu retains its scroll lock", () => {
  const outerDocumentEscape = vi.fn();
  const outerWindowEscape = vi.fn();
  document.addEventListener("keydown", outerDocumentEscape);
  window.addEventListener("keydown", outerWindowEscape);
  document.body.style.overflow = "hidden";
  try {
    const opener = mount();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
    expect(outerDocumentEscape).not.toHaveBeenCalled();
    expect(outerWindowEscape).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(opener, { key: "Escape" });
    expect(outerDocumentEscape).toHaveBeenCalledTimes(1);
    expect(outerWindowEscape).toHaveBeenCalledTimes(1);
  } finally {
    document.removeEventListener("keydown", outerDocumentEscape);
    window.removeEventListener("keydown", outerWindowEscape);
  }
});

it.each(["en", "es"] as const)(
  "retains %s failed question for an explicit editable retry without duplicate transcript",
  async (locale) => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Network unavailable"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, text: "A useful answer" }),
      });
    vi.stubGlobal("fetch", fetchMock);
    mount(locale);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "My original question" } });
    fireEvent.click(
      screen.getByRole("button", { name: locale === "es" ? "Enviar" : "Send" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Network unavailable",
      ),
    );
    expect(textarea).toHaveValue("My original question");
    expect(
      screen.queryByText("My original question", { selector: "article p" }),
    ).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.change(textarea, { target: { value: "My edited question" } });
    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "es" ? "Reintentar" : "Retry",
      }),
    );
    await waitFor(() =>
      expect(screen.getByText("A useful answer")).toBeVisible(),
    );
    expect(
      screen.getAllByText("My edited question", { selector: "article p" }),
    ).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).message).toBe(
      "My edited question",
    );
  },
);

it("preserves older transcript reading and offers an explicit new-reply jump", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, text: "New answer" }),
    }),
  );
  mount();
  const transcript = screen.getByText(
    "What can we help you with on AkiPasa?",
  ).parentElement!;
  Object.defineProperties(transcript, {
    scrollHeight: { configurable: true, value: 2000 },
    clientHeight: { configurable: true, value: 300 },
  });
  transcript.scrollTop = 100;
  fireEvent.scroll(transcript);
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Question" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "View new reply" }),
    ).toBeVisible(),
  );
  expect(transcript.scrollTop).toBe(100);
  fireEvent.click(screen.getByRole("button", { name: "View new reply" }));
  expect(transcript.scrollTop).toBe(2000);
  expect(screen.queryByRole("button", { name: "View new reply" })).toBeNull();
});
